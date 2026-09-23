import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { notify } from "./notify";

/**
 * Team creation and membership.
 *
 * A team always belongs to one event and has one leader. Open positions are
 * TeamSlot rows: a slot names the role needed and, optionally, the skills that
 * role should bring. Filling the last slot marks the team complete, which is
 * what removes it from the event's "teams looking for members" tab.
 */

export type CreateTeamInput = {
  leaderId: string;
  name: string;
  idea?: string;
  eventId: string;
  slots: Array<{ roleId: string; requiredSkillIds?: string[]; note?: string }>;
};

export async function createTeam(input: CreateTeamInput) {
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, name: true, status: true, maxTeamSize: true, minTeamSize: true },
  });

  if (!event) throw new HttpError(404, "That event does not exist");
  if (event.status !== "APPROVED") {
    throw new HttpError(400, "You can only create teams for approved events");
  }

  // The leader occupies one place, so open slots are capped one below the max.
  const maxSlots = Math.max(1, event.maxTeamSize - 1);
  if (input.slots.length > maxSlots) {
    throw new HttpError(
      400,
      `${event.name} allows teams of at most ${event.maxTeamSize}, so you can open at most ${maxSlots} roles`,
    );
  }

  const existing = await db.team.findFirst({
    where: { leaderId: input.leaderId, eventId: input.eventId },
    select: { id: true, name: true },
  });
  if (existing) {
    throw new HttpError(
      409,
      `You already lead "${existing.name}" for this event`,
    );
  }

  const roles = await db.role.findMany({
    where: { id: { in: input.slots.map((s) => s.roleId) } },
    select: { id: true },
  });
  const validRoles = new Set(roles.map((r) => r.id));

  const team = await db.team.create({
    data: {
      name: input.name,
      idea: input.idea,
      eventId: input.eventId,
      leaderId: input.leaderId,
      slots: {
        create: input.slots
          .filter((slot) => validRoles.has(slot.roleId))
          .map((slot) => ({
            roleId: slot.roleId,
            note: slot.note,
            requiredSkills: {
              connect: (slot.requiredSkillIds ?? []).map((id) => ({ id })),
            },
          })),
      },
    },
    select: { id: true },
  });

  // Creating a team means you are attending, and you are recruiting.
  await db.eventParticipation.upsert({
    where: { userId_eventId: { userId: input.leaderId, eventId: input.eventId } },
    update: { status: "TEAM_LOOKING_FOR_MEMBERS" },
    create: {
      userId: input.leaderId,
      eventId: input.eventId,
      status: "TEAM_LOOKING_FOR_MEMBERS",
    },
  });

  return team;
}

export async function getTeam(teamId: string) {
  return db.team.findUnique({
    where: { id: teamId },
    include: {
      event: true,
      leader: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          email: true,
          college: true,
          availability: true,
        },
      },
      slots: {
        include: {
          role: { select: { id: true, name: true } },
          requiredSkills: { select: { id: true, name: true } },
          filledBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              email: true,
              college: true,
              availability: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      requests: {
        include: {
          fromUser: { select: { id: true, name: true, username: true, image: true } },
          toUser: { select: { id: true, name: true, username: true, image: true } },
          slot: { include: { role: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/** Everyone on the team: the leader plus anyone filling a slot. */
export function teamMemberIds(team: {
  leaderId: string;
  slots: Array<{ filledById: string | null }>;
}): string[] {
  const ids = new Set<string>([team.leaderId]);
  for (const slot of team.slots) {
    if (slot.filledById) ids.add(slot.filledById);
  }
  return [...ids];
}

export async function updateTeam(
  teamId: string,
  userId: string,
  data: { name?: string; idea?: string },
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { leaderId: true },
  });
  if (!team) throw new HttpError(404, "That team does not exist");
  if (team.leaderId !== userId) {
    throw new HttpError(403, "Only the team leader can edit the team");
  }

  return db.team.update({
    where: { id: teamId },
    data: { name: data.name, idea: data.idea },
  });
}

/** The leader can free a slot again; the member can leave of their own accord. */
export async function releaseSlot(slotId: string, userId: string) {
  const slot = await db.teamSlot.findUnique({
    where: { id: slotId },
    include: {
      team: { select: { id: true, name: true, leaderId: true, eventId: true } },
      role: { select: { name: true } },
    },
  });

  if (!slot) throw new HttpError(404, "That role slot does not exist");
  if (!slot.filledById) throw new HttpError(409, "That slot is already open");

  const isLeader = slot.team.leaderId === userId;
  const isOccupant = slot.filledById === userId;
  if (!isLeader && !isOccupant) {
    throw new HttpError(403, "You cannot change this slot");
  }

  const removedId = slot.filledById;

  await db.$transaction([
    db.teamSlot.update({ where: { id: slotId }, data: { filledById: null } }),
    // The team is recruiting again.
    db.team.update({ where: { id: slot.teamId }, data: { isComplete: false } },),
    db.eventParticipation.upsert({
      where: {
        userId_eventId: { userId: removedId, eventId: slot.team.eventId },
      },
      update: { status: "LOOKING_FOR_TEAM" },
      create: {
        userId: removedId,
        eventId: slot.team.eventId,
        status: "LOOKING_FOR_TEAM",
      },
    }),
  ]);

  // Tell whichever side did not perform the action.
  await notify({
    userId: isLeader ? removedId : slot.team.leaderId,
    type: "REQUEST_DECLINED",
    title: isLeader
      ? `You were removed from ${slot.team.name}`
      : `Someone left ${slot.team.name}`,
    body: `${slot.role.name} is open again.`,
    href: `/teams/${slot.teamId}`,
  });
}

export async function listTeamsForEvent(eventId: string) {
  return db.team.findMany({
    where: { eventId },
    include: {
      leader: { select: { name: true, username: true, image: true } },
      event: { select: { name: true, slug: true } },
      slots: {
        include: {
          role: { select: { name: true } },
          filledBy: { select: { name: true, username: true, image: true } },
          requiredSkills: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ isComplete: "asc" }, { createdAt: "desc" }],
  });
}

export async function listTeamsForUser(userId: string) {
  return db.team.findMany({
    where: {
      OR: [{ leaderId: userId }, { slots: { some: { filledById: userId } } }],
    },
    include: {
      leader: { select: { name: true, username: true, image: true } },
      event: { select: { name: true, slug: true, startDate: true } },
      slots: {
        include: {
          role: { select: { name: true } },
          filledBy: { select: { name: true, username: true, image: true } },
          requiredSkills: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

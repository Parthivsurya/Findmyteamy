import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { notify } from "./notify";

/**
 * Invites and join requests — the rules that keep team formation honest.
 *
 * The critical cases from the test plan all live here: nobody can join a full
 * team, nobody can accept an invite for a slot that has already been filled,
 * blocked users cannot send requests, and event team-size limits are enforced.
 */

const INVITES_PER_DAY = 30;

export type SendRequestInput = {
  type: "INVITE" | "JOIN_REQUEST";
  teamId: string;
  slotId: string;
  fromUserId: string;
  toUserId?: string;
  message?: string;
};

async function assertNotBlocked(a: string, b: string): Promise<void> {
  const blocked = await db.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  if (blocked > 0) {
    throw new HttpError(403, "You cannot send a request to this person");
  }
}

async function assertUnderRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - 86_400_000);
  const sent = await db.teamRequest.count({
    where: { fromUserId: userId, createdAt: { gte: since } },
  });
  if (sent >= INVITES_PER_DAY) {
    throw new HttpError(
      429,
      `You have reached the limit of ${INVITES_PER_DAY} requests per day`,
    );
  }
}

/** Current member count: the leader plus everyone occupying a slot. */
function memberCount(team: {
  leaderId: string;
  slots: Array<{ filledById: string | null }>;
}): number {
  const ids = new Set<string>([team.leaderId]);
  for (const slot of team.slots) {
    if (slot.filledById) ids.add(slot.filledById);
  }
  return ids.size;
}

export async function sendRequest(input: SendRequestInput) {
  const team = await db.team.findUnique({
    where: { id: input.teamId },
    include: {
      event: { select: { id: true, name: true, maxTeamSize: true } },
      slots: { include: { role: { select: { name: true } } } },
      leader: { select: { id: true, name: true, username: true } },
    },
  });
  if (!team) throw new HttpError(404, "That team no longer exists");
  if (team.isComplete) throw new HttpError(409, "That team is already complete");

  const slot = team.slots.find((s) => s.id === input.slotId);
  if (!slot) throw new HttpError(404, "That role slot does not exist");
  if (slot.filledById) throw new HttpError(409, "That role has already been filled");

  if (memberCount(team) >= team.event.maxTeamSize) {
    throw new HttpError(
      409,
      `This event allows at most ${team.event.maxTeamSize} people per team`,
    );
  }

  // An invite goes from the leader outwards; a join request comes inwards.
  const isInvite = input.type === "INVITE";
  const toUserId = isInvite ? input.toUserId : team.leaderId;

  if (!toUserId) throw new HttpError(400, "No recipient for this request");
  if (toUserId === input.fromUserId) {
    throw new HttpError(400, "You cannot send a request to yourself");
  }

  if (isInvite && team.leaderId !== input.fromUserId) {
    throw new HttpError(403, "Only the team leader can invite people");
  }

  await assertNotBlocked(input.fromUserId, toUserId);
  await assertUnderRateLimit(input.fromUserId);

  const candidateId = isInvite ? toUserId : input.fromUserId;

  // Already on this team?
  if (candidateId === team.leaderId || team.slots.some((s) => s.filledById === candidateId)) {
    throw new HttpError(409, "That person is already on this team");
  }

  // One live request per person per slot.
  const duplicate = await db.teamRequest.findFirst({
    where: {
      teamId: team.id,
      slotId: slot.id,
      status: "PENDING",
      OR: [
        { fromUserId: input.fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: input.fromUserId },
      ],
    },
  });
  if (duplicate) {
    throw new HttpError(409, "There is already a pending request for this role");
  }

  const sender = await db.user.findUniqueOrThrow({
    where: { id: input.fromUserId },
    select: { name: true, username: true },
  });

  const request = await db.teamRequest.create({
    data: {
      type: input.type,
      teamId: team.id,
      slotId: slot.id,
      fromUserId: input.fromUserId,
      toUserId,
      message: input.message,
    },
  });

  await notify({
    userId: toUserId,
    type: isInvite ? "INVITE" : "JOIN_REQUEST",
    title: isInvite
      ? `${sender.name} invited you to ${team.name}`
      : `${sender.name} asked to join ${team.name}`,
    body: `${slot.role.name} · ${team.event.name}`,
    href: "/requests",
    data: { requestId: request.id, teamId: team.id, slotId: slot.id },
    emailPref: "emailOnRequests",
  });

  return request;
}

export type RespondInput = {
  requestId: string;
  userId: string;
  action: "accept" | "decline" | "cancel";
  message?: string;
};

export async function respondToRequest({
  requestId,
  userId,
  action,
}: RespondInput) {
  const request = await db.teamRequest.findUnique({
    where: { id: requestId },
    include: {
      team: {
        include: {
          event: { select: { id: true, name: true, maxTeamSize: true } },
          slots: true,
          leader: { select: { id: true, name: true } },
        },
      },
      slot: { include: { role: { select: { name: true } } } },
      fromUser: { select: { id: true, name: true, username: true } },
      toUser: { select: { id: true, name: true, username: true } },
    },
  });

  if (!request) throw new HttpError(404, "That request no longer exists");
  if (request.status !== "PENDING") {
    throw new HttpError(409, "That request has already been answered");
  }

  // Cancelling is the sender's move; accepting and declining are the receiver's.
  if (action === "cancel") {
    if (request.fromUserId !== userId) {
      throw new HttpError(403, "Only the sender can cancel this request");
    }
    return db.teamRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
  }

  if (request.toUserId !== userId) {
    throw new HttpError(403, "This request is not addressed to you");
  }

  if (action === "decline") {
    const updated = await db.teamRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    await notify({
      userId: request.fromUserId,
      type: "REQUEST_DECLINED",
      title: `${request.toUser.name} declined your request`,
      body: `${request.slot?.role.name ?? "Team member"} · ${request.team.name}`,
      href: "/requests?tab=sent",
      emailPref: "emailOnRequests",
    });

    return updated;
  }

  // --- accept ---------------------------------------------------------------
  const slot = request.slot;
  if (!slot) throw new HttpError(409, "That role slot no longer exists");

  // Re-read the slot: it may have been filled while this request sat waiting.
  const freshSlot = await db.teamSlot.findUnique({
    where: { id: slot.id },
    select: { filledById: true },
  });
  if (freshSlot?.filledById) {
    await db.teamRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED", respondedAt: new Date() },
    });
    throw new HttpError(409, "That role has already been filled by someone else");
  }

  if (memberCount(request.team) >= request.team.event.maxTeamSize) {
    throw new HttpError(
      409,
      `This team is already at the event's maximum of ${request.team.event.maxTeamSize}`,
    );
  }

  // The joining member is whoever is not the team leader.
  const memberId =
    request.type === "INVITE" ? request.toUserId : request.fromUserId;

  const remainingOpen = request.team.slots.filter(
    (s) => !s.filledById && s.id !== slot.id,
  ).length;

  const [, updatedRequest] = await db.$transaction([
    db.teamSlot.update({
      where: { id: slot.id },
      data: { filledById: memberId },
    }),
    db.teamRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    // When the last slot closes, the team drops out of "looking for members".
    db.team.update({
      where: { id: request.teamId },
      data: { isComplete: remainingOpen === 0 },
    }),
    // Any other pending request for this same slot can no longer be accepted.
    db.teamRequest.updateMany({
      where: { slotId: slot.id, status: "PENDING", id: { not: request.id } },
      data: { status: "EXPIRED", respondedAt: new Date() },
    }),
    // The new member is now in a team for this event.
    db.eventParticipation.upsert({
      where: {
        userId_eventId: { userId: memberId, eventId: request.team.eventId },
      },
      update: { status: "IN_TEAM" },
      create: {
        userId: memberId,
        eventId: request.team.eventId,
        status: "IN_TEAM",
      },
    }),
  ]);

  const otherPartyId =
    userId === request.fromUserId ? request.toUserId : request.fromUserId;

  await notify({
    userId: otherPartyId,
    type: "REQUEST_ACCEPTED",
    title:
      request.type === "INVITE"
        ? `${request.toUser.name} joined ${request.team.name}`
        : `You are in: ${request.team.name} accepted you`,
    body: `${slot.role.name} · ${request.team.event.name}. Contact details are now shared.`,
    href: `/teams/${request.teamId}`,
    emailPref: "emailOnRequests",
  });

  if (remainingOpen === 0) {
    await notify({
      userId: request.team.leaderId,
      type: "TEAM_COMPLETE",
      title: `${request.team.name} is complete`,
      body: "Every role slot is filled. Your team is no longer listed as looking for members.",
      href: `/teams/${request.teamId}`,
    });
  }

  return updatedRequest;
}

export async function listRequests(userId: string) {
  const [received, sent] = await Promise.all([
    db.teamRequest.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { name: true, username: true, image: true, email: true } },
        team: {
          select: {
            id: true,
            name: true,
            idea: true,
            event: { select: { name: true, slug: true } },
          },
        },
        slot: { include: { role: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.teamRequest.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: { select: { name: true, username: true, image: true, email: true } },
        team: {
          select: {
            id: true,
            name: true,
            event: { select: { name: true, slug: true } },
          },
        },
        slot: { include: { role: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return { received, sent };
}

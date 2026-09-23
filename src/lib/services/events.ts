import { db } from "@/lib/db";
import { containsText } from "@/lib/db-text";
import { HttpError } from "@/lib/api";
import { slugify } from "@/lib/utils";

/**
 * Events. Anyone signed in can submit one, but it stays PENDING until an admin
 * approves it — that is what keeps spam and duplicates off the events list.
 */

export type CreateEventInput = {
  createdById: string;
  name: string;
  organizer: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  mode: string;
  location?: string;
  minTeamSize: number;
  maxTeamSize: number;
  themes?: string;
  prize?: string;
  registrationLink?: string;
  bannerUrl?: string;
  /** Admins can publish immediately; everyone else goes through review. */
  autoApprove?: boolean;
};

/** Finds a free slug, since two colleges may run similarly named events. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "event";
  let candidate = base;

  for (let attempt = 1; attempt <= 40; attempt++) {
    const taken = await db.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}-${attempt + 1}`;
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function createEvent(input: CreateEventInput) {
  // Cheap duplicate detection: same name starting on the same day.
  const dayStart = new Date(input.startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const duplicate = await db.event.findFirst({
    where: {
      name: input.name,
      startDate: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, slug: true, status: true },
  });
  if (duplicate) {
    throw new HttpError(
      409,
      "An event with that name and start date already exists",
    );
  }

  return db.event.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name),
      organizer: input.organizer,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      registrationDeadline: input.registrationDeadline,
      mode: input.mode,
      location: input.location,
      minTeamSize: input.minTeamSize,
      maxTeamSize: input.maxTeamSize,
      themes: input.themes ?? "",
      prize: input.prize,
      registrationLink: input.registrationLink,
      bannerUrl: input.bannerUrl,
      status: input.autoApprove ? "APPROVED" : "PENDING",
      createdById: input.createdById,
    },
    select: { id: true, slug: true, status: true },
  });
}

export async function getEventBySlug(slug: string) {
  return db.event.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { name: true, username: true } },
      _count: { select: { participations: true, teams: true } },
    },
  });
}

/** People attending an event, split by what they are looking for. */
export async function getEventPeople(eventId: string, viewerId?: string | null) {
  const participations = await db.eventParticipation.findMany({
    where: {
      eventId,
      ...(viewerId
        ? {
            user: {
              blocksMade: { none: { blockedId: viewerId } },
              blockedBy: { none: { blockerId: viewerId } },
            },
          }
        : {}),
    },
    include: {
      user: {
        include: {
          skills: { include: { skill: { select: { id: true, name: true } } } },
          roles: { include: { role: { select: { name: true } } } },
          _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return participations.map((participation) => ({
    status: participation.status,
    updatedAt: participation.updatedAt,
    user: {
      id: participation.user.id,
      name: participation.user.name,
      username: participation.user.username,
      image: participation.user.image,
      college: participation.user.college,
      location: participation.user.location,
      availability: participation.user.availability,
      verifiedWins: participation.user._count.achievements,
      topSkills: participation.user.skills.slice(0, 5).map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        level: s.level,
      })),
      roles: participation.user.roles.map((r) => r.role.name),
    },
  }));
}

export async function setParticipation(
  userId: string,
  eventId: string,
  status: string | null,
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event) throw new HttpError(404, "That event does not exist");
  if (event.status !== "APPROVED") {
    throw new HttpError(400, "That event is still awaiting approval");
  }

  // A null status means "I am no longer attending".
  if (status === null) {
    await db.eventParticipation.deleteMany({ where: { userId, eventId } });
    return null;
  }

  return db.eventParticipation.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { status },
    create: { userId, eventId, status },
  });
}

export async function listEvents({
  q,
  mode,
  when = "upcoming",
  page = 1,
  perPage = 12,
}: {
  q?: string;
  mode?: string;
  when?: "upcoming" | "past" | "all";
  page?: number;
  perPage?: number;
}) {
  const now = new Date();
  const where: Record<string, unknown> = { status: "APPROVED" };

  if (when === "upcoming") where.endDate = { gte: now };
  if (when === "past") where.endDate = { lt: now };
  if (mode) where.mode = mode;
  if (q) {
    where.OR = [
      { name: containsText(q) },
      { organizer: containsText(q) },
      { themes: containsText(q) },
      { location: containsText(q) },
    ];
  }

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: when === "past" ? { startDate: "desc" } : { startDate: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: {
          select: {
            participations: { where: { status: "LOOKING_FOR_TEAM" } },
            teams: true,
          },
        },
      },
    }),
    db.event.count({ where }),
  ]);

  return {
    events,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

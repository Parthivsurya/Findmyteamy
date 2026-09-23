import { db } from "@/lib/db";
import { containsText } from "@/lib/db-text";
import { SKILL_LEVELS, type SkillLevel } from "@/lib/enums";
import { matchReasons, matchScore, type SearchNeed } from "@/lib/matching";
import type { SearchQuery } from "@/lib/validators";
import { resolveRoleId, resolveSkillIds, getSkillMap } from "./catalog";

/**
 * People search.
 *
 * Following the documented v1 design, the database applies the hard filters and
 * the application computes the match score over the result set. That keeps the
 * ranking rules in one readable place (src/lib/matching.ts) and lets them be
 * tuned without a migration. CANDIDATE_CAP bounds the work; past that point the
 * plan is to move the same ranking onto Meilisearch.
 */
const CANDIDATE_CAP = 500;

export type CandidateResult = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  college: string | null;
  location: string | null;
  availability: string;
  profileCompleteness: number;
  verifiedWins: number;
  topSkills: Array<{ id: string; name: string; level: string }>;
  roles: string[];
  score: number;
  reasons: string[];
  eventStatus: string | null;
  /** From the Amrita roll address — drives the year and branch filters. */
  branchCode: string | null;
  joiningYear: number | null;
  programYears: number | null;
  campusCode: string | null;
};

export type SearchResults = {
  results: CandidateResult[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  skillIds: string[];
  roleId: string | null;
  eventId: string | null;
};

/** Levels at or above the requested minimum. */
function levelsAtLeast(min: SkillLevel): string[] {
  const index = SKILL_LEVELS.indexOf(min);
  return SKILL_LEVELS.slice(index === -1 ? 0 : index) as unknown as string[];
}

export async function searchPeople(
  query: SearchQuery,
  viewerId?: string | null,
): Promise<SearchResults> {
  const skillIds = await resolveSkillIds(query.skills);
  const roleId = await resolveRoleId(query.role);

  // The event filter accepts a slug or an id so links stay readable.
  const event = query.event
    ? await db.event.findFirst({
        where: { OR: [{ id: query.event }, { slug: query.event }] },
        select: { id: true },
      })
    : null;
  const eventId = event?.id ?? null;

  const levelFilter = query.minLevel ? levelsAtLeast(query.minLevel) : null;

  // --- hard filters, applied by the database --------------------------------
  const where: Record<string, unknown> = { onboarded: true };
  const and: Array<Record<string, unknown>> = [];

  if (viewerId) {
    and.push({ id: { not: viewerId } });
    // Blocking cuts both ways: neither side appears in the other's results.
    and.push({ blocksMade: { none: { blockedId: viewerId } } });
    and.push({ blockedBy: { none: { blockerId: viewerId } } });
  }

  if (query.availability) {
    and.push({ availability: query.availability });
  } else {
    // "Not available" users are hidden from search unless asked for directly.
    and.push({ availability: { not: "NOT_AVAILABLE" } });
  }

  if (skillIds.length) {
    if (query.skillMatch === "all") {
      for (const skillId of skillIds) {
        and.push({
          skills: {
            some: { skillId, ...(levelFilter ? { level: { in: levelFilter } } : {}) },
          },
        });
      }
    } else {
      and.push({
        skills: {
          some: {
            skillId: { in: skillIds },
            ...(levelFilter ? { level: { in: levelFilter } } : {}),
          },
        },
      });
    }
  }

  // --- Amrita academic filters --------------------------------------------
  // "Same year" and "same branch" are resolved from the searcher's own address.
  if (query.sameYear || query.sameBranch || query.sameCampus) {
    const me = viewerId
      ? await db.user.findUnique({
          where: { id: viewerId },
          select: { branchCode: true, joiningYear: true, campusCode: true },
        })
      : null;

    if (query.sameBranch && me?.branchCode) and.push({ branchCode: me.branchCode });
    if (query.sameYear && me?.joiningYear) and.push({ joiningYear: me.joiningYear });
    if (query.sameCampus && me?.campusCode) and.push({ campusCode: me.campusCode });
  }

  if (query.branch) and.push({ branchCode: query.branch.toLowerCase() });
  if (query.joinYear) and.push({ joiningYear: query.joinYear });
  if (query.campus) and.push({ campusCode: query.campus.toLowerCase() });

  if (roleId) and.push({ roles: { some: { roleId } } });
  if (eventId) and.push({ participations: { some: { eventId } } });
  if (query.verifiedOnly) {
    and.push({ achievements: { some: { status: "VERIFIED" } } });
  }

  // containsText() adds mode:"insensitive" only where the database needs it.
  if (query.college) and.push({ college: containsText(query.college) });
  if (query.location) and.push({ location: containsText(query.location) });

  if (query.q) {
    and.push({
      OR: [
        { name: containsText(query.q) },
        { username: containsText(query.q) },
        { college: containsText(query.q) },
        { bio: containsText(query.q) },
        { skills: { some: { skill: { name: containsText(query.q) } } } },
        { roles: { some: { role: { name: containsText(query.q) } } } },
      ],
    });
  }

  if (and.length) where.AND = and;

  const candidates = await db.user.findMany({
    where,
    take: CANDIDATE_CAP,
    orderBy: { lastActiveAt: "desc" },
    include: {
      skills: { select: { skillId: true, level: true, skill: { select: { id: true, name: true } } } },
      roles: { select: { roleId: true, role: { select: { name: true } } } },
      participations: eventId
        ? { where: { eventId }, select: { status: true } }
        : { select: { status: true }, take: 0 },
      _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
    },
  });

  // --- teams that are already full for this event are not worth showing -----
  let excluded = new Set<string>();
  if (eventId) {
    const completeTeams = await db.team.findMany({
      where: { eventId, isComplete: true },
      select: { leaderId: true, slots: { select: { filledById: true } } },
    });
    excluded = new Set(
      completeTeams.flatMap((team) => [
        team.leaderId,
        ...team.slots.map((s) => s.filledById).filter((id): id is string => Boolean(id)),
      ]),
    );
  }

  const need: SearchNeed = {
    skillIds,
    skillMatch: query.skillMatch,
    roleId,
    eventId,
    minLevel: query.minLevel ?? null,
  };
  const skillNames = await getSkillMap();
  const highlight = new Set(skillIds);

  let scored: CandidateResult[] = candidates
    .filter((user) => !excluded.has(user.id))
    .map((user) => {
      const forScoring = {
        availability: user.availability,
        profileCompleteness: user.profileCompleteness,
        lastActiveAt: user.lastActiveAt,
        verifiedWins: user._count.achievements,
        skills: user.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
        roleIds: user.roles.map((r) => r.roleId),
        eventStatus: user.participations[0]?.status ?? null,
      };

      // Requested skills first, so the cards show why this person matched.
      const sortedSkills = [...user.skills].sort((a, b) => {
        const aMatch = highlight.has(a.skillId) ? 1 : 0;
        const bMatch = highlight.has(b.skillId) ? 1 : 0;
        return bMatch - aMatch;
      });

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        college: user.college,
        location: user.location,
        availability: user.availability,
        profileCompleteness: user.profileCompleteness,
        verifiedWins: user._count.achievements,
        topSkills: sortedSkills.slice(0, 5).map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
          level: s.level,
        })),
        roles: user.roles.map((r) => r.role.name),
        score: matchScore(forScoring, need),
        reasons: matchReasons(forScoring, need, skillNames),
        eventStatus: forScoring.eventStatus,
        branchCode: user.branchCode,
        joiningYear: user.joiningYear,
        programYears: user.programYears,
        campusCode: user.campusCode,
      };
    });

  if (query.minWins) {
    scored = scored.filter((c) => c.verifiedWins >= query.minWins!);
  }

  scored.sort((a, b) => {
    if (query.sort === "wins" && b.verifiedWins !== a.verifiedWins) {
      return b.verifiedWins - a.verifiedWins;
    }
    if (query.sort === "recent") return 0; // already ordered by lastActiveAt
    return b.score - a.score || b.verifiedWins - a.verifiedWins;
  });

  const total = scored.length;
  const totalPages = Math.max(1, Math.ceil(total / query.perPage));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.perPage;

  return {
    results: scored.slice(start, start + query.perPage),
    total,
    page,
    perPage: query.perPage,
    totalPages,
    skillIds,
    roleId,
    eventId,
  };
}

/**
 * Team Builder: run one ranked search per open role slot.
 *
 * Each slot gets its own candidate list, because a good ML engineer and a good
 * designer are not comparable on one leaderboard.
 */
export type SlotNeed = { roleId: string; skillIds: string[]; count: number };

export type SlotCandidates = {
  roleId: string;
  roleName: string;
  skillIds: string[];
  count: number;
  candidates: CandidateResult[];
};

export async function buildTeam({
  slots,
  eventId,
  viewerId,
  limitPerRole = 6,
  excludeUserIds = [],
}: {
  slots: SlotNeed[];
  eventId?: string | null;
  viewerId?: string | null;
  limitPerRole?: number;
  excludeUserIds?: string[];
}): Promise<SlotCandidates[]> {
  const roles = await db.role.findMany({
    where: { id: { in: slots.map((s) => s.roleId) } },
    select: { id: true, name: true },
  });
  const roleNames = new Map(roles.map((r) => [r.id, r.name]));

  const exclude = new Set(excludeUserIds);

  const results = await Promise.all(
    slots.map(async (slot) => {
      const search = await searchPeople(
        {
          q: undefined,
          skills: slot.skillIds,
          skillMatch: "any",
          minLevel: undefined,
          role: slot.roleId,
          availability: undefined,
          event: eventId ?? undefined,
          verifiedOnly: false,
          minWins: undefined,
          college: undefined,
          location: undefined,
          mode: undefined,
          sameYear: false,
          sameBranch: false,
          sameCampus: false,
          branch: undefined,
          joinYear: undefined,
          campus: undefined,
          sort: "match",
          page: 1,
          // Over-fetch so that filling earlier slots still leaves candidates.
          perPage: Math.min(50, limitPerRole + exclude.size + 6),
        },
        viewerId,
      );

      return {
        roleId: slot.roleId,
        roleName: roleNames.get(slot.roleId) ?? "Role",
        skillIds: slot.skillIds,
        count: slot.count,
        candidates: search.results
          .filter((candidate) => !exclude.has(candidate.id))
          .slice(0, limitPerRole),
      };
    }),
  );

  return results;
}

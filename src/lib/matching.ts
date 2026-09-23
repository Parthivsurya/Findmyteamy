import { LEVEL_WEIGHT, type SkillLevel } from "./enums";
import { daysSince } from "./utils";

/**
 * Match scoring (Section 11 of the product documentation).
 *
 *   Skill match            40   share of required skills held, weighted by level
 *   Role match             20   full points when the user lists the required role
 *   Availability           15   full when free for this event, partial otherwise
 *   Verified achievements  15   5 points per verified win, capped
 *   Profile completeness    5   proportional to the completeness percentage
 *   Recent activity         5   active within the last 14 days
 *
 * The score is computed in the application after a filtered database query, so
 * the weights can be tuned from real usage without a migration. When the user
 * base outgrows Postgres-side filtering, the same function can rank documents
 * coming back from Meilisearch.
 */

export const WEIGHTS = {
  skills: 40,
  role: 20,
  availability: 15,
  achievements: 15,
  completeness: 5,
  activity: 5,
} as const;

export const MAX_SCORE = 100;
const RECENT_ACTIVITY_DAYS = 14;

export type CandidateForScoring = {
  availability: string;
  profileCompleteness: number;
  lastActiveAt: Date | string | null;
  verifiedWins: number;
  skills: Array<{ skillId: string; level: string }>;
  roleIds: string[];
  /** Participation status for the event being searched, when there is one. */
  eventStatus?: string | null;
};

export type SearchNeed = {
  skillIds?: string[];
  /** "all" requires every listed skill; "any" rewards partial overlap. */
  skillMatch?: "any" | "all";
  roleId?: string | null;
  eventId?: string | null;
  minLevel?: SkillLevel | null;
};

function levelWeight(level: string): number {
  return LEVEL_WEIGHT[level as SkillLevel] ?? 0.6;
}

function skillPoints(candidate: CandidateForScoring, need: SearchNeed): number {
  const required = need.skillIds ?? [];
  if (required.length === 0) {
    // Nothing specific was asked for: reward a well-stocked profile a little so
    // that empty searches are not ordered arbitrarily.
    return Math.min(candidate.skills.length, 5) / 5;
  }

  const held = new Map(candidate.skills.map((s) => [s.skillId, s.level]));
  const total = required.reduce(
    (sum, id) => sum + (held.has(id) ? levelWeight(held.get(id)!) : 0),
    0,
  );
  return total / required.length;
}

/** 0–15, per Section 11: full for open or looking at this event. */
export function availabilityPoints(candidate: CandidateForScoring, eventId?: string | null): number {
  if (candidate.availability === "NOT_AVAILABLE") return 0;

  if (eventId && candidate.eventStatus) {
    if (candidate.eventStatus === "LOOKING_FOR_TEAM") return 15;
    if (candidate.eventStatus === "TEAM_LOOKING_FOR_MEMBERS") return 9;
    return 3; // already in a team for this event
  }

  if (candidate.availability === "OPEN") return eventId ? 12 : 15;
  return 7; // EVENTS_ONLY, but not marked as attending this event
}

export function matchScore(candidate: CandidateForScoring, need: SearchNeed = {}): number {
  let score = skillPoints(candidate, need) * WEIGHTS.skills;

  if (need.roleId && candidate.roleIds.includes(need.roleId)) {
    score += WEIGHTS.role;
  } else if (!need.roleId) {
    // No role requested — do not punish everyone by withholding 20 points.
    score += WEIGHTS.role * 0.5;
  }

  score += availabilityPoints(candidate, need.eventId);
  score += Math.min(candidate.verifiedWins * 5, WEIGHTS.achievements);
  score += (candidate.profileCompleteness / 100) * WEIGHTS.completeness;

  if (daysSince(candidate.lastActiveAt) <= RECENT_ACTIVITY_DAYS) {
    score += WEIGHTS.activity;
  }

  // Incomplete profiles rank lower, which is what nudges people to finish them.
  if (candidate.profileCompleteness < 60) score *= 0.85;

  return Math.max(0, Math.min(MAX_SCORE, Math.round(score)));
}

/** Human-readable reasons shown under a candidate card. */
export function matchReasons(
  candidate: CandidateForScoring,
  need: SearchNeed,
  skillNames: Map<string, string>,
): string[] {
  const reasons: string[] = [];
  const required = need.skillIds ?? [];

  if (required.length) {
    const held = new Map(candidate.skills.map((s) => [s.skillId, s.level]));
    const matched = required.filter((id) => held.has(id));
    if (matched.length) {
      const names = matched
        .slice(0, 3)
        .map((id) => skillNames.get(id) ?? "skill")
        .join(", ");
      reasons.push(
        matched.length === required.length
          ? `Has all required skills (${names})`
          : `${matched.length} of ${required.length} required skills (${names})`,
      );
    }
    const expert = matched.filter((id) => held.get(id) === "EXPERT").length;
    if (expert) reasons.push(`Expert level in ${expert === 1 ? "one" : expert} of them`);
  }

  if (need.roleId && candidate.roleIds.includes(need.roleId)) {
    reasons.push("Plays the role you need");
  }
  if (candidate.eventStatus === "LOOKING_FOR_TEAM") {
    reasons.push("Looking for a team at this event");
  } else if (candidate.availability === "OPEN") {
    reasons.push("Open to teams");
  }
  if (candidate.verifiedWins > 0) {
    reasons.push(
      `${candidate.verifiedWins} verified ${candidate.verifiedWins === 1 ? "win" : "wins"}`,
    );
  }
  if (daysSince(candidate.lastActiveAt) <= RECENT_ACTIVITY_DAYS) {
    reasons.push("Active recently");
  }

  return reasons.slice(0, 4);
}

export function scoreBand(score: number): "strong" | "good" | "fair" {
  if (score >= 75) return "strong";
  if (score >= 50) return "good";
  return "fair";
}

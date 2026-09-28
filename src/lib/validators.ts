import { z } from "zod";
import {
  ACHIEVEMENT_POSITIONS,
  ACHIEVEMENT_STATUSES,
  AVAILABILITY,
  EVENT_MODES,
  EVENT_STATUSES,
  PARTICIPATION_STATUSES,
  REQUEST_TYPES,
  SKILL_CATEGORIES,
  SKILL_LEVELS,
} from "./enums";

/**
 * Every request body and query string is validated here, on the server, before
 * it reaches the database — and the same schemas back the client-side forms so
 * the two can never disagree about limits.
 */

/**
 * Wraps a query-string schema so that a parameter which is present but blank
 * counts as absent.
 *
 * A GET form submits every control it contains, so an untouched `<select>`
 * arrives as `""` rather than being left out. Zod rightly rejects `""` for an
 * enum or a coerced number, and because one bad field fails the whole object,
 * the search page fell back to `parse({})` and silently discarded every filter
 * the student had set. Pressing "Apply filters" with `sameYear=true` in the URL
 * therefore came back with both checkboxes clear and no filtering applied, and
 * `/api/search` answered the same request with a 400.
 *
 * Stripping blanks first makes "present but empty" mean "not set", which is
 * what a form means by it, and keeps a genuinely invalid value an error.
 */
function queryObject<T extends z.ZodRawShape>(shape: T) {
  return z.preprocess((value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (typeof raw === "string" && raw.trim() === "") continue;
      if (Array.isArray(raw)) {
        const kept = raw.filter((i) => !(typeof i === "string" && i.trim() === ""));
        if (kept.length === 0) continue;
        out[key] = kept;
        continue;
      }
      out[key] = raw;
    }
    return out;
  }, z.object(shape));
}

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^https?:\/\/.+\..+/.test(v), {
    message: "Enter a full URL starting with http:// or https://",
  });

/** Query strings arrive as "react,nodejs" — turn them into arrays of ids. */
const commaList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [] as string[];
    const parts = Array.isArray(value) ? value : value.split(",");
    return parts.map((p) => p.trim()).filter(Boolean);
  });

const boolFlag = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "true" || v === "1" || v === "on");

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Pick at least 3 characters")
  .max(24, "Keep it under 24 characters")
  .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens or underscores")
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved");

export const RESERVED_USERNAMES = new Set([
  "admin", "api", "login", "logout", "signup", "settings", "search", "events",
  "teams", "team-builder", "dashboard", "onboarding", "requests", "notifications",
  "u", "me", "new", "about", "help", "support", "privacy", "terms", "root",
]);

export const profileSchema = z.object({
  name: trimmed(60).min(2, "Tell people your name"),
  username: usernameSchema.optional(),
  bio: optionalText(300),
  college: optionalText(120),
  location: optionalText(80),
  image: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  resumeUrl: optionalUrl,
  showGithub: z.boolean().optional(),
  showLinkedin: z.boolean().optional(),
  showPortfolio: z.boolean().optional(),
});

export const skillsSchema = z.object({
  skills: z
    .array(
      z.object({
        skillId: z.string().min(1),
        level: z.enum(SKILL_LEVELS),
      }),
    )
    .max(40, "That is a lot of skills, keep the list focused"),
});

export const rolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).max(3, "Choose at most three roles"),
});

export const availabilitySchema = z.object({
  availability: z.enum(AVAILABILITY),
});

export const notificationPrefsSchema = z.object({
  emailOnRequests: z.boolean().optional(),
  emailOnVerification: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
});

export const onboardingSchema = z.object({
  name: trimmed(60).min(2, "Tell people your name"),
  username: usernameSchema,
  bio: optionalText(300),
  college: optionalText(120),
  location: optionalText(80),
  skills: skillsSchema.shape.skills,
  roleIds: rolesSchema.shape.roleIds,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  availability: z.enum(AVAILABILITY),
});

// ---------------------------------------------------------------------------
// Skills master list
// ---------------------------------------------------------------------------

export const skillSuggestSchema = z.object({
  name: trimmed(40).min(1, "Name the skill"),
  category: z.enum(SKILL_CATEGORIES),
});

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export const achievementSchema = z.object({
  title: trimmed(120).min(3, "Give the achievement a title"),
  eventName: trimmed(120).min(2, "Which event was this?"),
  organizer: optionalText(120),
  position: z.enum(ACHIEVEMENT_POSITIONS),
  date: z.coerce.date(),
  description: optionalText(600),
  proofUrl: optionalUrl,
});

export const achievementUpdateSchema = achievementSchema.partial();

export const achievementReviewSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  reviewNote: optionalText(300),
});

// ---------------------------------------------------------------------------
// Search and Team Builder
// ---------------------------------------------------------------------------

export const searchQuerySchema = queryObject({
  q: optionalText(80),
  skills: commaList,
  skillMatch: z.enum(["any", "all"]).optional().default("any"),
  minLevel: z.enum(SKILL_LEVELS).optional(),
  role: optionalText(40),
  availability: z.enum(AVAILABILITY).optional(),
  event: optionalText(60),
  verifiedOnly: boolFlag,
  minWins: z.coerce.number().int().min(0).max(20).optional(),
  college: optionalText(120),
  location: optionalText(80),
  mode: z.enum(EVENT_MODES).optional(),

  // --- Amrita academic filters ---------------------------------------------
  // "same as me" pairs, resolved against the signed-in student's own address,
  // plus explicit values for shareable links.
  sameYear: boolFlag,
  sameBranch: boolFlag,
  sameCampus: boolFlag,
  /** Branch code, e.g. "cse", "aie", "cys". */
  branch: optionalText(8),
  /** Joining year, e.g. 2024 — this is what "same year" means. */
  joinYear: z.coerce.number().int().min(2000).max(2100).optional(),
  campus: optionalText(4),

  sort: z.enum(["match", "wins", "recent"]).optional().default("match"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const teamBuilderSchema = z.object({
  eventId: z.string().optional(),
  teamId: z.string().optional(),
  slots: z
    .array(
      z.object({
        roleId: z.string().min(1, "Pick a role"),
        skillIds: z.array(z.string()).max(8).optional().default([]),
        count: z.coerce.number().int().min(1).max(5).optional().default(1),
      }),
    )
    .min(1, "Add at least one role")
    .max(6, "Six open roles is the maximum"),
  limitPerRole: z.coerce.number().int().min(1).max(20).optional().default(6),
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const eventSchema = z
  .object({
    name: trimmed(120).min(3, "Name the event"),
    organizer: trimmed(120).min(2, "Who is organising it?"),
    description: optionalText(2000),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    registrationDeadline: z.coerce.date().optional(),
    mode: z.enum(EVENT_MODES),
    location: optionalText(120),
    minTeamSize: z.coerce.number().int().min(1).max(20).default(2),
    maxTeamSize: z.coerce.number().int().min(1).max(20).default(4),
    themes: optionalText(300),
    prize: optionalText(120),
    registrationLink: optionalUrl,
    bannerUrl: optionalUrl,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "The event cannot end before it starts",
    path: ["endDate"],
  })
  .refine((v) => v.maxTeamSize >= v.minTeamSize, {
    message: "Maximum team size must be at least the minimum",
    path: ["maxTeamSize"],
  })
  .refine((v) => v.mode === "ONLINE" || Boolean(v.location), {
    message: "In-person events need a location",
    path: ["location"],
  });

export const eventReviewSchema = z.object({
  status: z.enum(EVENT_STATUSES),
});

export const eventListQuerySchema = queryObject({
  q: optionalText(80),
  mode: z.enum(EVENT_MODES).optional(),
  when: z.enum(["upcoming", "past", "all"]).optional().default("upcoming"),
  page: z.coerce.number().int().min(1).max(200).optional().default(1),
});

export const participationSchema = z.object({
  status: z.enum(PARTICIPATION_STATUSES).nullable(),
});

// ---------------------------------------------------------------------------
// Teams and requests
// ---------------------------------------------------------------------------

export const teamSchema = z.object({
  name: trimmed(80).min(3, "Name your team"),
  idea: optionalText(600),
  eventId: z.string().min(1, "Pick an event"),
  slots: z
    .array(
      z.object({
        roleId: z.string().min(1),
        requiredSkillIds: z.array(z.string()).max(8).optional().default([]),
        note: optionalText(140),
      }),
    )
    .min(1, "Add at least one open role")
    .max(9),
});

export const teamUpdateSchema = z.object({
  name: trimmed(80).min(3).optional(),
  idea: optionalText(600),
});

export const requestSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  teamId: z.string().min(1),
  slotId: z.string().min(1),
  toUserId: z.string().optional(),
  message: optionalText(300),
});

export const requestActionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"]),
  message: optionalText(300),
});

export const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  reason: trimmed(500).min(10, "Tell us what happened"),
});

export const blockSchema = z.object({
  userId: z.string().min(1),
});

export const achievementStatusFilter = z.object({
  status: z.enum(ACHIEVEMENT_STATUSES).optional().default("PENDING"),
});

// ---------------------------------------------------------------------------
// Skill checks
// ---------------------------------------------------------------------------

export const assessmentAnswerSchema = z.object({
  assessmentId: z.string().min(1),
  answer: z
    .string()
    .trim()
    .min(60, "Write a little more, three or four sentences is plenty")
    .max(4000, "That answer is too long"),
});

export const startAssessmentSchema = z.object({
  skillId: z.string().min(1, "Pick a skill"),
});

/**
 * Enum-like unions and their display labels.
 *
 * SQLite has no native enums, so these values live in the database as strings
 * and are validated here (and by the Zod schemas in ./validators.ts). Moving to
 * PostgreSQL means turning each of these into a real Prisma `enum` — the app
 * code keeps working unchanged.
 */

export const AVAILABILITY = ["OPEN", "EVENTS_ONLY", "NOT_AVAILABLE"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  OPEN: "Open to teams",
  EVENTS_ONLY: "Open for specific events",
  NOT_AVAILABLE: "Not available",
};

export const AVAILABILITY_HINT: Record<Availability, string> = {
  OPEN: "Actively looking and happy to be contacted",
  EVENTS_ONLY: "Available only for the events I have marked",
  NOT_AVAILABLE: "Busy, hidden from search results",
};

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  EXPERT: "Expert",
};

/** Used by the match score — higher levels earn more credit for a skill. */
export const LEVEL_WEIGHT: Record<SkillLevel, number> = {
  BEGINNER: 0.6,
  INTERMEDIATE: 0.85,
  EXPERT: 1,
};

export const SKILL_CATEGORIES = [
  "FRONTEND",
  "BACKEND",
  "MOBILE",
  "DATA_AI",
  "DATABASE",
  "CLOUD_DEVOPS",
  "DESIGN",
  "EMERGING",
  "SOFT",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  MOBILE: "Mobile",
  DATA_AI: "Data and AI/ML",
  DATABASE: "Database",
  CLOUD_DEVOPS: "Cloud and DevOps",
  DESIGN: "Design",
  EMERGING: "Emerging Tech",
  SOFT: "Soft Skills",
};

export const ACHIEVEMENT_POSITIONS = [
  "WINNER",
  "RUNNER_UP",
  "FINALIST",
  "PARTICIPANT",
  "OTHER",
] as const;
export type AchievementPosition = (typeof ACHIEVEMENT_POSITIONS)[number];

export const ACHIEVEMENT_POSITION_LABEL: Record<AchievementPosition, string> = {
  WINNER: "Winner",
  RUNNER_UP: "Runner-up",
  FINALIST: "Finalist",
  PARTICIPANT: "Participant",
  OTHER: "Other",
};

export const ACHIEVEMENT_STATUSES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;
export type AchievementStatus = (typeof ACHIEVEMENT_STATUSES)[number];

export const ACHIEVEMENT_STATUS_LABEL: Record<AchievementStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Under review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const EVENT_MODES = ["ONLINE", "OFFLINE", "HYBRID"] as const;
export type EventMode = (typeof EVENT_MODES)[number];

export const EVENT_MODE_LABEL: Record<EventMode, string> = {
  ONLINE: "Online",
  OFFLINE: "In person",
  HYBRID: "Hybrid",
};

export const EVENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const PARTICIPATION_STATUSES = [
  "LOOKING_FOR_TEAM",
  "IN_TEAM",
  "TEAM_LOOKING_FOR_MEMBERS",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  LOOKING_FOR_TEAM: "Looking for a team",
  IN_TEAM: "Already in a team",
  TEAM_LOOKING_FOR_MEMBERS: "Team looking for members",
};

export const REQUEST_TYPES = ["INVITE", "JOIN_REQUEST"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "INVITE",
  "JOIN_REQUEST",
  "REQUEST_ACCEPTED",
  "REQUEST_DECLINED",
  "ACHIEVEMENT_VERIFIED",
  "ACHIEVEMENT_REJECTED",
  "EVENT_SOON",
  "AVAILABILITY_REMINDER",
  "TEAM_COMPLETE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

/** The twelve standard team roles seeded into the Role master table. */
export const STANDARD_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "ML/AI Engineer",
  "Data Analyst",
  "UI/UX Designer",
  "DevOps Engineer",
  "Blockchain Developer",
  "Hardware/IoT Engineer",
  "Pitcher/Presenter",
  "Team Lead/Project Manager",
] as const;

/**
 * Profile completeness (0–100).
 *
 * Search ranks profiles below 60% lower, so the weights below are deliberately
 * tilted towards the fields a team leader actually needs in order to judge
 * someone: skills, roles and a bio.
 */

export type CompletenessInput = {
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  college?: string | null;
  location?: string | null;
  skillCount: number;
  roleCount: number;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
};

export type CompletenessItem = {
  label: string;
  points: number;
  earned: number;
  done: boolean;
  href: string;
};

export function completenessBreakdown(input: CompletenessInput): CompletenessItem[] {
  const skillRatio = Math.min(input.skillCount, 3) / 3;
  const linkCount = [input.githubUrl, input.linkedinUrl, input.portfolioUrl].filter(
    Boolean,
  ).length;

  return [
    {
      label: "Name and photo",
      points: 10,
      earned: input.name && input.image ? 10 : input.name ? 5 : 0,
      done: Boolean(input.name && input.image),
      href: "/settings/profile",
    },
    {
      label: "Short bio",
      points: 15,
      earned: input.bio && input.bio.trim().length >= 40 ? 15 : input.bio ? 8 : 0,
      done: Boolean(input.bio && input.bio.trim().length >= 40),
      href: "/settings/profile",
    },
    {
      label: "College or company",
      points: 10,
      earned: input.college ? 10 : 0,
      done: Boolean(input.college),
      href: "/settings/profile",
    },
    {
      label: "Location",
      points: 10,
      earned: input.location ? 10 : 0,
      done: Boolean(input.location),
      href: "/settings/profile",
    },
    {
      label: "At least three skills",
      points: 25,
      earned: Math.round(skillRatio * 25),
      done: input.skillCount >= 3,
      href: "/settings/skills",
    },
    {
      label: "Team roles you can play",
      points: 15,
      earned: input.roleCount > 0 ? 15 : 0,
      done: input.roleCount > 0,
      href: "/settings/skills",
    },
    {
      label: "Profile links",
      points: 15,
      earned: Math.min(linkCount, 3) * 5,
      done: linkCount >= 3,
      href: "/settings/profile",
    },
  ];
}

export function profileCompleteness(input: CompletenessInput): number {
  const total = completenessBreakdown(input).reduce((sum, i) => sum + i.earned, 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

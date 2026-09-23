import { db } from "@/lib/db";
import { profileCompleteness } from "@/lib/completeness";
import { SKILL_LEVELS, type SkillLevel } from "@/lib/enums";

/**
 * Profile writes. Completeness is recalculated after every change so that the
 * value stored on the user row — which search ranking reads — never drifts.
 */

export async function recomputeCompleteness(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      image: true,
      bio: true,
      college: true,
      location: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      _count: { select: { skills: true, roles: true } },
    },
  });
  if (!user) return 0;

  const score = profileCompleteness({
    name: user.name,
    image: user.image,
    bio: user.bio,
    college: user.college,
    location: user.location,
    skillCount: user._count.skills,
    roleCount: user._count.roles,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    portfolioUrl: user.portfolioUrl,
  });

  await db.user.update({
    where: { id: userId },
    data: { profileCompleteness: score },
  });
  return score;
}

/** Parses the "skillId:LEVEL" rows produced by the levelled skill picker. */
export function parseSkillRows(
  values: string[],
): Array<{ skillId: string; level: SkillLevel }> {
  const seen = new Set<string>();
  const rows: Array<{ skillId: string; level: SkillLevel }> = [];

  for (const value of values) {
    const [skillId, rawLevel] = value.split(":");
    if (!skillId || seen.has(skillId)) continue;
    const level = (SKILL_LEVELS as readonly string[]).includes(rawLevel ?? "")
      ? (rawLevel as SkillLevel)
      : "INTERMEDIATE";
    seen.add(skillId);
    rows.push({ skillId, level });
  }

  return rows;
}

export async function replaceSkills(
  userId: string,
  skills: Array<{ skillId: string; level: string }>,
) {
  // Only approved skills from the master list may be attached.
  const valid = await db.skill.findMany({
    where: { id: { in: skills.map((s) => s.skillId) }, approved: true },
    select: { id: true },
  });
  const allowed = new Set(valid.map((s) => s.id));

  await db.$transaction([
    db.userSkill.deleteMany({ where: { userId } }),
    db.userSkill.createMany({
      data: skills
        .filter((s) => allowed.has(s.skillId))
        .map((s) => ({ userId, skillId: s.skillId, level: s.level })),
    }),
  ]);

  return recomputeCompleteness(userId);
}

export async function replaceRoles(userId: string, roleIds: string[]) {
  const valid = await db.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true },
  });

  await db.$transaction([
    db.userRole.deleteMany({ where: { userId } }),
    db.userRole.createMany({
      // Three roles maximum, as the onboarding step states.
      data: valid.slice(0, 3).map((role) => ({ userId, roleId: role.id })),
    }),
  ]);

  return recomputeCompleteness(userId);
}

export async function setAvailability(userId: string, availability: string) {
  await db.user.update({
    where: { id: userId },
    data: { availability, availabilityUpdatedAt: new Date() },
  });
}

export async function isUsernameAvailable(
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !existing || existing.id === exceptUserId;
}

import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Master-table lookups. Skills and roles change rarely but are needed by
 * almost every form, so each request resolves them once.
 */

export const getSkills = cache(async () => {
  return db.skill.findMany({
    where: { approved: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true },
  });
});

export const getRoles = cache(async () => {
  return db.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
});

export const getSkillMap = cache(async () => {
  const skills = await getSkills();
  return new Map(skills.map((s) => [s.id, s.name]));
});

/** Accepts skill ids or plain names, so URLs like ?skills=React stay shareable. */
export async function resolveSkillIds(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];

  const skills = await getSkills();
  const byId = new Map(skills.map((s) => [s.id, s.id]));
  const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s.id]));

  const resolved = values
    .map((value) => byId.get(value) ?? byName.get(value.toLowerCase()))
    .filter((id): id is string => Boolean(id));

  return [...new Set(resolved)];
}

/** Same idea for roles: an id or the role's display name both work. */
export async function resolveRoleId(value?: string | null): Promise<string | null> {
  if (!value) return null;
  const roles = await getRoles();
  return (
    roles.find((r) => r.id === value)?.id ??
    roles.find((r) => r.name.toLowerCase() === value.toLowerCase())?.id ??
    null
  );
}

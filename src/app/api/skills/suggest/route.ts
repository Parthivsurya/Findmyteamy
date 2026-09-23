import { conflict, ok, parseBody, requireSession, route } from "@/lib/api";
import { db } from "@/lib/db";
import { containsText } from "@/lib/db-text";
import { skillSuggestSchema } from "@/lib/validators";

/**
 * POST /api/skills/suggest — propose a skill for the master list. It is held
 * unapproved until an admin accepts it, which is what stops "React" and
 * "ReactJS" becoming two different things.
 */
export const POST = route(async (request) => {
  await requireSession();
  const { name, category } = await parseBody(request, skillSuggestSchema);

  const existing = await db.skill.findFirst({
    // A suggestion must not create a second "React" differing only in case.
    where: { name: containsText(name) },
    select: { id: true, approved: true, name: true },
  });

  if (existing) {
    return conflict(
      existing.approved
        ? "That skill already exists"
        : "That skill has already been suggested and is awaiting review",
    );
  }

  const skill = await db.skill.create({
    data: { name, category, approved: false },
    select: { id: true, name: true, category: true, approved: true },
  });

  return ok(skill, { status: 201 });
});

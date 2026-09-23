import { ok, parseBody, requireSession, route } from "@/lib/api";
import { db } from "@/lib/db";
import { recomputeCompleteness } from "@/lib/services/profile";
import { profileSchema } from "@/lib/validators";

/** GET /api/me — the signed-in student's full profile. */
export const GET = route(async () => {
  const session = await requireSession();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      college: true,
      location: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      availability: true,
      profileCompleteness: true,
      role: true,
      onboarded: true,
      campusCode: true,
      schoolCode: true,
      programCode: true,
      programYears: true,
      branchCode: true,
      joiningYear: true,
      skills: { include: { skill: { select: { id: true, name: true, category: true } } } },
      roles: { include: { role: { select: { id: true, name: true } } } },
    },
  });

  return ok(user);
});

/** PATCH /api/me — update profile details. */
export const PATCH = route(async (request) => {
  const session = await requireSession();
  const data = await parseBody(request, profileSchema);

  const user = await db.user.update({
    where: { id: session.id },
    data: {
      name: data.name,
      ...(data.username ? { username: data.username } : {}),
      bio: data.bio ?? null,
      location: data.location ?? null,
      image: data.image ?? null,
      githubUrl: data.githubUrl ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
    },
    select: { id: true, username: true },
  });

  const completeness = await recomputeCompleteness(session.id);
  return ok({ ...user, profileCompleteness: completeness });
});

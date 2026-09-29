import { notFound, ok, requireSession, route } from "@/lib/api";
import { db } from "@/lib/db";

/**
 * GET /api/users/:username - one student's profile.
 *
 * Signed in only, despite the page it backs having been called "public": on
 * an Amrita-only platform "public" means visible to other students, not to
 * the internet. The email address is never part of this response, and
 * rejected achievements are excluded.
 */
export const GET = route(
  async (_request, context: { params: Promise<{ username: string }> }) => {
    await requireSession();
    const { username } = await context.params;

    const user = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        college: true,
        location: true,
        availability: true,
        profileCompleteness: true,
        campusCode: true,
        schoolCode: true,
        branchCode: true,
        joiningYear: true,
        programYears: true,
        githubUrl: true,
        linkedinUrl: true,
        portfolioUrl: true,
        showGithub: true,
        showLinkedin: true,
        showPortfolio: true,
        lastActiveAt: true,
        skills: {
          select: { level: true, skill: { select: { id: true, name: true, category: true } } },
        },
        roles: { select: { role: { select: { id: true, name: true } } } },
        achievements: {
          where: { status: { not: "REJECTED" } },
          orderBy: [{ status: "asc" }, { date: "desc" }],
          select: {
            id: true,
            title: true,
            eventName: true,
            organizer: true,
            position: true,
            date: true,
            description: true,
            proofUrl: true,
            status: true,
          },
        },
        participations: {
          where: { event: { status: "APPROVED" } },
          select: {
            status: true,
            event: { select: { name: true, slug: true, startDate: true } },
          },
        },
      },
    });

    if (!user) return notFound("No student with that username");

    // Honour each link's visibility flag.
    return ok({
      ...user,
      githubUrl: user.showGithub ? user.githubUrl : null,
      linkedinUrl: user.showLinkedin ? user.linkedinUrl : null,
      portfolioUrl: user.showPortfolio ? user.portfolioUrl : null,
    });
  },
);

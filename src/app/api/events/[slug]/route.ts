import { notFound, ok, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getEventBySlug, getEventPeople } from "@/lib/services/events";
import { listTeamsForEvent } from "@/lib/services/teams";

/**
 * GET /api/events/:slug - event details, plus the people and teams for a
 * signed-in student.
 *
 * The event is public because anyone should be able to read what a hackathon
 * is. Who is attending it is not: `people` and `teams` come back empty for an
 * anonymous request, and `viewerSignedIn` says why so a client can prompt for
 * a sign-in rather than showing an empty list.
 */
export const GET = route(
  async (_request, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;

    const event = await getEventBySlug(slug);
    if (!event) return notFound("No event with that slug");

    const viewer = await getCurrentUser();
    const [people, teams] = viewer
      ? await Promise.all([
          getEventPeople(event.id, viewer.id),
          listTeamsForEvent(event.id),
        ])
      : [[], []];

    return ok({
      event,
      viewerSignedIn: Boolean(viewer),
      people,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        idea: team.idea,
        isComplete: team.isComplete,
        leader: team.leader,
        openRoles: team.slots
          .filter((slot) => !slot.filledById)
          .map((slot) => ({
            id: slot.id,
            role: slot.role.name,
            requiredSkills: slot.requiredSkills.map((s) => s.name),
          })),
      })),
    });
  },
);

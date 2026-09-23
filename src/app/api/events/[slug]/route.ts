import { notFound, ok, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getEventBySlug, getEventPeople } from "@/lib/services/events";
import { listTeamsForEvent } from "@/lib/services/teams";

/** GET /api/events/:slug — event details, the people attending, and the teams. */
export const GET = route(
  async (_request, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;

    const event = await getEventBySlug(slug);
    if (!event) return notFound("No event with that slug");

    const viewer = await getCurrentUser();
    const [people, teams] = await Promise.all([
      getEventPeople(event.id, viewer?.id),
      listTeamsForEvent(event.id),
    ]);

    return ok({
      event,
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

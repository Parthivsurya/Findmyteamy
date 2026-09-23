import { ok, parseBody, requireSession, route } from "@/lib/api";
import { buildTeam } from "@/lib/services/search";
import { teamBuilderSchema } from "@/lib/validators";

/**
 * POST /api/team-builder — role-slot search. Returns one ranked candidate list
 * per requested role rather than a single mixed leaderboard.
 */
export const POST = route(async (request) => {
  const session = await requireSession();
  const body = await parseBody(request, teamBuilderSchema);

  const groups = await buildTeam({
    slots: body.slots.map((slot) => ({
      roleId: slot.roleId,
      skillIds: slot.skillIds ?? [],
      count: slot.count ?? 1,
    })),
    eventId: body.eventId ?? null,
    viewerId: session.id,
    limitPerRole: body.limitPerRole,
  });

  return ok({ groups });
});

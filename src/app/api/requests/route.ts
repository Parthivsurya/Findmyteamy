import { ok, parseBody, requireSession, route } from "@/lib/api";
import { listRequests, sendRequest } from "@/lib/services/requests";
import { requestSchema } from "@/lib/validators";

/** GET /api/requests — the inbox: requests received and sent. */
export const GET = route(async () => {
  const session = await requireSession();
  return ok(await listRequests(session.id));
});

/** POST /api/requests — send an invite or a join request. */
export const POST = route(async (request) => {
  const session = await requireSession();
  const body = await parseBody(request, requestSchema);

  const created = await sendRequest({
    type: body.type,
    teamId: body.teamId,
    slotId: body.slotId,
    fromUserId: session.id,
    toUserId: body.toUserId,
    message: body.message,
  });

  return ok(created, { status: 201 });
});

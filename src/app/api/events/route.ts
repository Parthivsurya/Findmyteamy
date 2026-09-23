import { ok, parseBody, parseQuery, requireSession, route } from "@/lib/api";
import { createEvent, listEvents } from "@/lib/services/events";
import { eventListQuerySchema, eventSchema } from "@/lib/validators";

/** GET /api/events — approved events, filtered. */
export const GET = route(async (request) => {
  const query = parseQuery(request.url, eventListQuerySchema);
  return ok(await listEvents(query));
});

/** POST /api/events — submit an event, which goes to the review queue. */
export const POST = route(async (request) => {
  const session = await requireSession();
  const data = await parseBody(request, eventSchema);

  const event = await createEvent({
    createdById: session.id,
    ...data,
    autoApprove: session.role === "ADMIN",
  });

  return ok(event, { status: 201 });
});

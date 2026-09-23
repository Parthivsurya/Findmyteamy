import { ok, parseBody, requireSession, route } from "@/lib/api";
import { respondToRequest } from "@/lib/services/requests";
import { requestActionSchema } from "@/lib/validators";

/** PATCH /api/requests/:id — accept, decline or cancel. */
export const PATCH = route(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const session = await requireSession();
    const { id } = await context.params;
    const { action } = await parseBody(request, requestActionSchema);

    const updated = await respondToRequest({
      requestId: id,
      userId: session.id,
      action,
    });

    return ok(updated);
  },
);

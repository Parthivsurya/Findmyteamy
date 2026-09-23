import { ok, requireSession, route } from "@/lib/api";
import { db } from "@/lib/db";
import { markNotificationsRead } from "@/lib/services/notify";

/** GET /api/notifications — the signed-in student's notifications. */
export const GET = route(async () => {
  const session = await requireSession();

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.count({ where: { userId: session.id, read: false } }),
  ]);

  return ok({ notifications, unread });
});

/** PATCH /api/notifications — mark all, or specific ids, as read. */
export const PATCH = route(async (request) => {
  const session = await requireSession();

  let ids: string[] | undefined;
  try {
    const body = (await request.json()) as { ids?: string[] };
    ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : undefined;
  } catch {
    ids = undefined; // an empty body means "mark everything"
  }

  const count = await markNotificationsRead(session.id, ids);
  return ok({ updated: count });
});

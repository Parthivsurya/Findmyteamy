import { requireSession, route } from "@/lib/api";
import { db } from "@/lib/db";

/**
 * Data export. Returns everything held about the signed-in student as a JSON
 * download, which is the "users can export their data" requirement.
 */
export const GET = route(async () => {
  const session = await requireSession();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      skills: { include: { skill: { select: { name: true, category: true } } } },
      roles: { include: { role: { select: { name: true } } } },
      achievements: true,
      participations: { include: { event: { select: { name: true, slug: true } } } },
      ledTeams: { include: { event: { select: { name: true } } } },
      filledSlots: {
        include: {
          role: { select: { name: true } },
          team: { select: { name: true } },
        },
      },
      notifications: true,
      sentRequests: true,
      inboxRequests: true,
    },
  });

  // The password hash is deliberately not part of the export.
  const { passwordHash: _passwordHash, ...rest } = user;

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: rest,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="findmyteammate-${user.username}.json"`,
      "Cache-Control": "no-store",
    },
  });
});

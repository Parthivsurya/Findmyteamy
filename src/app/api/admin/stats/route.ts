import { ok, requireAdminSession, route } from "@/lib/api";
import { db } from "@/lib/db";

/** GET /api/admin/stats — the numbers shown on the admin dashboard. */
export const GET = route(async () => {
  await requireAdminSession();

  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const [
    students,
    onboarded,
    activeThisMonth,
    teams,
    completeTeams,
    verifiedAchievements,
    pendingAchievements,
    events,
    pendingEvents,
    requests,
    acceptedRequests,
    openReports,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { onboarded: true } }),
    db.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
    db.team.count(),
    db.team.count({ where: { isComplete: true } }),
    db.achievement.count({ where: { status: "VERIFIED" } }),
    db.achievement.count({ where: { status: "PENDING" } }),
    db.event.count({ where: { status: "APPROVED" } }),
    db.event.count({ where: { status: "PENDING" } }),
    db.teamRequest.count(),
    db.teamRequest.count({ where: { status: "ACCEPTED" } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);

  return ok({
    students,
    onboarded,
    activeThisMonth,
    teams,
    completeTeams,
    verifiedAchievements,
    pendingAchievements,
    events,
    pendingEvents,
    requests,
    acceptedRequests,
    // The headline metric: does the platform actually form teams?
    inviteAcceptanceRate: requests ? Math.round((acceptedRequests / requests) * 100) : 0,
    openReports,
  });
});

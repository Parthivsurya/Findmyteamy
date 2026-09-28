import { ok, route } from "@/lib/api";
import { assertCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
import { digestEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { buildTeam } from "@/lib/services/search";
import { notify } from "@/lib/services/notify";
import { purgeExpiredOtps } from "@/lib/services/otp";

/**
 * All scheduled work behind one endpoint.
 *
 * Vercel's Hobby plan allows only a small number of cron jobs at a low
 * frequency, so running everything from a single daily trigger keeps the
 * deployment inside those limits. The weekly digest is gated on the day of the
 * week rather than needing its own schedule.
 *
 * The individual endpoints still exist for running one job by hand.
 */
export const GET = route(async (request) => {
  assertCronRequest(request);

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const summary: Record<string, number | string> = {};

  // --- housekeeping -------------------------------------------------------
  summary.otpsPurged = await purgeExpiredOtps();

  const expired = await db.teamRequest.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
    },
    data: { status: "EXPIRED", respondedAt: now },
  });
  summary.requestsExpired = expired.count;

  const unlocked = await db.user.updateMany({
    where: { lockedUntil: { lt: now } },
    data: { lockedUntil: null, failedLoginCount: 0 },
  });
  summary.accountsUnlocked = unlocked.count;

  // --- availability reminders --------------------------------------------
  const stale = await db.user.findMany({
    where: {
      onboarded: true,
      availability: { not: "NOT_AVAILABLE" },
      availabilityUpdatedAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
      notifications: {
        none: {
          type: "AVAILABILITY_REMINDER",
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
        },
      },
    },
    select: { id: true },
    take: 500,
  });

  for (const user of stale) {
    await notify({
      userId: user.id,
      type: "AVAILABILITY_REMINDER",
      title: "Is your availability still correct?",
      body: "You set it over a month ago. Confirming it keeps you visible to team leaders and keeps search results honest.",
      href: "/dashboard",
      emailPref: "emailOnRequests",
    });
  }
  summary.availabilityReminders = stale.length;

  // --- weekly digest, Mondays only ---------------------------------------
  if (!isMonday) {
    summary.digest = "skipped (runs on Mondays)";
    return ok({ job: "daily", ...summary });
  }

  const recruiting = await db.team.findMany({
    where: {
      isComplete: false,
      slots: { some: { filledById: null } },
      event: { endDate: { gte: now }, status: "APPROVED" },
      leader: { emailWeeklyDigest: true },
    },
    include: {
      event: { select: { id: true, name: true } },
      leader: { select: { id: true, name: true, email: true } },
      slots: {
        where: { filledById: null },
        include: {
          role: { select: { id: true, name: true } },
          requiredSkills: { select: { id: true } },
        },
      },
    },
    take: 200,
  });

  let sent = 0;

  for (const team of recruiting) {
    const groups = await buildTeam({
      slots: team.slots.map((slot) => ({
        roleId: slot.roleId,
        skillIds: slot.requiredSkills.map((s) => s.id),
        count: 1,
      })),
      eventId: team.eventId,
      viewerId: team.leader.id,
      limitPerRole: 3,
      excludeUserIds: [team.leader.id],
    });

    const withCandidates = groups.filter((group) => group.candidates.length);
    if (withCandidates.length === 0) continue;

    await sendMail({
      to: team.leader.email,
      ...digestEmail({
        firstName: team.leader.name.split(" ")[0] ?? "there",
        teamName: team.name,
        eventName: team.event.name,
        teamId: team.id,
        groups: withCandidates.map((group) => ({
          roleName: group.roleName,
          candidates: group.candidates.map((candidate) => ({
            name: candidate.name,
            score: candidate.score,
            reason: candidate.reasons[0],
          })),
        })),
      }),
    });
    sent++;
  }

  summary.digestEmailsSent = sent;
  return ok({ job: "daily", ...summary });
});

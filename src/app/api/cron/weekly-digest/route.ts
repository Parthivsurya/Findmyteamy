import { ok, route } from "@/lib/api";
import { assertCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
import { digestEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { buildTeam } from "@/lib/services/search";

/**
 * Weekly digest for team leaders who still have open roles: a handful of
 * candidates per role, chosen by the same ranking search uses. Email only —
 * it is a nudge, not a notification. Run weekly.
 */
export const GET = route(async (request) => {
  assertCronRequest(request);

  const recruiting = await db.team.findMany({
    where: {
      isComplete: false,
      slots: { some: { filledById: null } },
      // Only for events that have not happened yet.
      event: { endDate: { gte: new Date() }, status: "APPROVED" },
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

  return ok({ job: "weekly-digest", teamsConsidered: recruiting.length, emailsSent: sent });
});

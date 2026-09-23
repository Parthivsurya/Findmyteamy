import { ok, route } from "@/lib/api";
import { assertCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
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

    const lines = [
      `Hi ${team.leader.name.split(" ")[0]},`,
      "",
      `${team.name} still has open roles for ${team.event.name}. Here are this week's best matches:`,
      "",
      ...withCandidates.flatMap((group) => [
        `${group.roleName}:`,
        ...group.candidates.map(
          (candidate) =>
            `  • ${candidate.name} (${candidate.score} match) — ${candidate.reasons[0] ?? "profile match"}`,
        ),
        "",
      ]),
      `Invite them: ${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")}/team-builder?team=${team.id}`,
      "",
      "— FindMyTeammate",
      "",
      "To stop these, turn off the weekly digest in Settings.",
    ];

    await sendMail({
      to: team.leader.email,
      subject: `${withCandidates.reduce((n, g) => n + g.candidates.length, 0)} people match your open roles on ${team.name}`,
      text: lines.join("\n"),
    });
    sent++;
  }

  return ok({ job: "weekly-digest", teamsConsidered: recruiting.length, emailsSent: sent });
});

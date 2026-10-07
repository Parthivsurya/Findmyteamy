import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { AchievementCard } from "@/components/profile/achievement";
import { ModeBadge } from "@/components/events/event-card";
import {
  ResolveReport,
  ReviewAchievement,
  ReviewEvent,
  ReviewSkill,
} from "@/components/admin/review";
import { ShieldIcon } from "@/components/icons";
import { AccessDecision, SeedMemberForm } from "@/components/admin/vouch-admin";
import { VouchTree } from "@/components/admin/vouch-tree";
import { listAccessRequests } from "@/lib/services/access-requests";
import { listAllUsers } from "@/lib/services/accounts";
import { DeleteUser } from "@/components/admin/people";
import { joinRouteLabel } from "@/lib/join-route";
import { buildVouchForest } from "@/lib/services/vouch";
import { SKILL_CATEGORY_LABEL, type SkillCategory } from "@/lib/enums";
import { listFlaggedAssessments } from "@/lib/services/skill-assessment";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateRange, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [
    pendingAchievements,
    pendingEvents,
    suggestedSkills,
    openReports,
    flaggedAssessments,
    assessmentUsage,
    stats,
    accessRequests,
    forest,
    people,
  ] = await Promise.all([
    db.achievement.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            name: true,
            username: true,
            image: true,
            branchCode: true,
            joiningYear: true,
          },
        },
      },
      take: 50,
    }),
    db.event.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true, username: true } } },
      take: 50,
    }),
    db.skill.findMany({
      where: { approved: false },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: {
        reporter: { select: { name: true, username: true } },
        reported: { select: { name: true, username: true, image: true } },
      },
      take: 50,
    }),
    listFlaggedAssessments(),
    // No account usage endpoint exists on the judging provider, so the only
    // record of spend is what each request reported.
    db.skillAssessment.aggregate({
      _sum: { inputTokens: true, outputTokens: true },
      _count: { _all: true },
    }),
    Promise.all([
      db.user.count(),
      db.user.count({ where: { onboarded: true } }),
      db.user.count({
        where: { lastActiveAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      }),
      db.team.count(),
      db.team.count({ where: { isComplete: true } }),
      db.achievement.count({ where: { status: "VERIFIED" } }),
      db.event.count({ where: { status: "APPROVED" } }),
      db.teamRequest.count(),
      db.teamRequest.count({ where: { status: "ACCEPTED" } }),
    ]),
    listAccessRequests("PENDING"),
    buildVouchForest(),
    listAllUsers(),
  ]);

  const [
    users,
    onboarded,
    activeThisMonth,
    teams,
    completeTeams,
    verifiedWins,
    approvedEvents,
    requests,
    acceptedRequests,
  ] = stats;

  const acceptanceRate = requests
    ? Math.round((acceptedRequests / requests) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          <ShieldIcon className="size-5 text-brand" />
          Admin
          <Badge tone="brand">{admin.name}</Badge>
        </h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Verification keeps the badges meaningful. This is the queue that does it.
        </p>
      </header>

      {/* ------------------------------------------------------------ stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={users} hint={`${onboarded} onboarded`} />
        <Stat
          label="Active (30d)"
          value={activeThisMonth}
          hint={users ? `${Math.round((activeThisMonth / users) * 100)}% of all` : undefined}
        />
        <Stat
          label="Teams formed"
          value={teams}
          hint={`${completeTeams} complete`}
        />
        <Stat
          label="Invite acceptance"
          value={`${acceptanceRate}%`}
          hint={`${acceptedRequests} of ${requests}`}
        />
        <Stat label="Verified wins" value={verifiedWins} />
        <Stat label="Events live" value={approvedEvents} />
        <Stat label="In review" value={pendingAchievements.length} hint="achievements" />
        <Stat label="Open reports" value={openReports.length} />
        <Stat
          label="Skill checks"
          value={assessmentUsage._count._all}
          hint={
            assessmentUsage._sum.inputTokens
              ? `${(
                  (assessmentUsage._sum.inputTokens ?? 0) +
                  (assessmentUsage._sum.outputTokens ?? 0)
                ).toLocaleString()} tokens used`
              : undefined
          }
        />
      </section>

      <div className="space-y-6">
        {/* -------------------------------------------------- the people */}
        <Card>
          <CardHead
            title="People"
            description="Everyone with an account. Deleting one removes their skills, teams, requests and vouches with them, and cannot be undone."
            action={<Badge tone="neutral">{people.length} accounts</Badge>}
          />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-[var(--line)]">
              {people.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-start gap-3 px-4 py-3"
                >
                  <div className="min-w-44 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/u/${person.username}`}
                        className="text-[0.88rem] font-medium hover:text-brand"
                      >
                        {person.name}
                      </Link>
                      {person.role === "ADMIN" ? (
                        <Badge tone="brand">Admin</Badge>
                      ) : null}
                      <Badge tone="neutral">{joinRouteLabel(person.joinedVia)}</Badge>
                      {!person.emailVerifiedAt ? (
                        <Badge tone="warn">Unverified</Badge>
                      ) : null}
                      {!person.onboarded ? (
                        <Badge tone="warn">Onboarding unfinished</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[0.75rem] text-ink-muted">
                      {person.email}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      {person._count.skills} skills · {person.profileCompleteness}% complete
                      {person._count.vouchesWritten > 0
                        ? ` · vouched for ${person._count.vouchesWritten}`
                        : ""}
                      {person.lastActiveAt
                        ? ` · active ${relativeTime(person.lastActiveAt)}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {person.id === admin.id ? (
                      <span className="text-[0.75rem] text-ink-muted">
                        This is you
                      </span>
                    ) : (
                      <DeleteUser
                        userId={person.id}
                        username={person.username}
                        name={person.name}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* ------------------------------------------- access requests */}
        <Card>
          <CardHead
            title="Requests to join"
            description="Students with a valid Amrita address but no vouch link. Their address already proves they are a student, so this is about accountability rather than identity."
            action={
              accessRequests.length ? (
                <Badge tone="warn">{accessRequests.length} waiting</Badge>
              ) : null
            }
          />
          <CardBody className="space-y-4">
            {accessRequests.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">
                Nothing waiting. The queue is clear.
              </p>
            ) : (
              accessRequests.map((request) => (
                <div
                  key={request.id}
                  className="space-y-2 rounded-box border border-line p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.82rem] font-medium">
                      {request.email}
                    </span>
                    <span className="ml-auto text-[0.75rem] text-ink-muted">
                      {relativeTime(request.createdAt)}
                    </span>
                  </div>
                  {request.note ? (
                    <p className="text-[0.85rem] leading-relaxed text-ink-2">
                      {request.note}
                    </p>
                  ) : null}
                  <AccessDecision requestId={request.id} />
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* ------------------------------------------------ the vouch tree */}
        <Card>
          <CardHead
            title="How people got in"
            description="Every account traces to a voucher, an approved request, or the founding cohort. A root with an unusually large subtree is where collusion would show up first."
            action={<SeedMemberForm />}
          />
          <CardBody>
            <VouchTree roots={forest.roots} totals={forest.totals} />
          </CardBody>
        </Card>

        {/* ------------------------------------------ achievement queue */}
        <Card>
          <CardHead
            title="Achievement verification queue"
            description={
              pendingAchievements.length
                ? `${pendingAchievements.length} waiting`
                : "Nothing waiting. The queue is clear."
            }
          />
          <CardBody className="space-y-4">
            {pendingAchievements.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">
                Every submitted achievement has been reviewed.
              </p>
            ) : (
              pendingAchievements.map((achievement) => (
                <div key={achievement.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={achievement.user.name}
                      image={achievement.user.image}
                      size="xs"
                    />
                    <Link
                      href={`/u/${achievement.user.username}`}
                      className="text-[0.83rem] font-semibold hover:text-brand"
                    >
                      {achievement.user.name}
                    </Link>
                    <span className="text-[0.75rem] text-ink-muted">
                      {achievement.user.branchCode?.toUpperCase()}{" "}
                      {achievement.user.joiningYear}
                      {" · submitted "}
                      {relativeTime(achievement.createdAt)}
                    </span>
                  </div>

                  <AchievementCard achievement={achievement} showStatus={false} />
                  <ReviewAchievement achievementId={achievement.id} />
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* ----------------------------------------------- event queue */}
        <Card>
          <CardHead
            title="Event approval queue"
            description={
              pendingEvents.length
                ? `${pendingEvents.length} waiting`
                : "No events waiting for review."
            }
          />
          <CardBody className="space-y-4">
            {pendingEvents.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">
                Nothing to approve right now.
              </p>
            ) : (
              pendingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-box border border-line p-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[0.92rem] font-semibold">{event.name}</h3>
                      <ModeBadge mode={event.mode} />
                    </div>
                    <p className="mt-0.5 text-[0.8rem] text-ink-muted">
                      {event.organizer} · {formatDateRange(event.startDate, event.endDate)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {event.description ? (
                      <p className="mt-2 line-clamp-3 text-[0.82rem] leading-relaxed text-ink-2">
                        {event.description}
                      </p>
                    ) : null}
                    {event.createdBy ? (
                      <p className="mt-1.5 text-[0.75rem] text-ink-muted">
                        Submitted by{" "}
                        <Link
                          href={`/u/${event.createdBy.username}`}
                          className="font-medium text-brand hover:underline"
                        >
                          {event.createdBy.name}
                        </Link>
                      </p>
                    ) : null}
                  </div>

                  <ReviewEvent eventId={event.id} />
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* --------------------------------------- skill suggestions */}
        <Card>
          <CardHead
            title="Suggested skills"
            description="Approving one adds it to the master list everyone picks from."
          />
          <CardBody>
            {suggestedSkills.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">No suggestions pending.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {suggestedSkills.map((skill) => (
                  <li
                    key={skill.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="text-[0.88rem] font-semibold">{skill.name}</p>
                      <p className="text-[0.75rem] text-ink-muted">
                        {SKILL_CATEGORY_LABEL[skill.category as SkillCategory] ??
                          skill.category}
                      </p>
                    </div>
                    <ReviewSkill skillId={skill.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* --------------------------------- flagged skill checks */}
        <Card>
          <CardHead
            title="Skill checks flagged for review"
            description="Answers the model thought were probably machine-written. Treat the score as a hint, not a verdict: short answers and non-native English both trip it."
          />
          <CardBody>
            {flaggedAssessments.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">Nothing flagged.</p>
            ) : (
              <ul className="space-y-3">
                {flaggedAssessments.map((a) => (
                  <li key={a.id} className="rounded-box border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[0.87rem]">
                        <Link
                          href={`/u/${a.user.username}`}
                          className="font-semibold hover:text-brand"
                        >
                          {a.user.name}
                        </Link>
                        <span className="text-ink-muted">
                          {" "}
                          · {a.skill.name} · claimed {a.claimedLevel.toLowerCase()}
                        </span>
                      </p>
                      <Badge tone="warn">
                        {a.aiLikelihood}% likely machine-written
                      </Badge>
                    </div>

                    <p className="mt-2 text-[0.78rem] font-medium text-ink-muted">
                      Question
                    </p>
                    <p className="text-[0.83rem] text-ink-2">{a.question}</p>

                    <p className="mt-2 text-[0.78rem] font-medium text-ink-muted">
                      Answer
                    </p>
                    <p className="whitespace-pre-line rounded-box bg-surface-2 px-3 py-2 text-[0.83rem] leading-relaxed text-ink-2">
                      {a.answer}
                    </p>

                    {a.aiSignals ? (
                      <p className="mt-2 text-[0.78rem] text-ink-muted">
                        Signals: {(JSON.parse(a.aiSignals) as string[]).join("; ")}
                      </p>
                    ) : null}
                    {a.rationale ? (
                      <p className="mt-1 text-[0.78rem] text-ink-muted">
                        Would have been ranked {a.assessedLevel?.toLowerCase()} at{" "}
                        {a.rationale}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* ------------------------------------------------- reports */}
        <Card>
          <CardHead
            title="Reported students"
            description={openReports.length ? `${openReports.length} open` : "Nothing reported."}
          />
          <CardBody>
            {openReports.length === 0 ? (
              <p className="text-[0.85rem] text-ink-muted">No open reports.</p>
            ) : (
              <ul className="space-y-3">
                {openReports.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-box border border-line p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.87rem]">
                        <Link
                          href={`/u/${report.reported.username}`}
                          className="font-semibold hover:text-brand"
                        >
                          {report.reported.name}
                        </Link>
                        <span className="text-ink-muted">
                          {" "}
                          reported by {report.reporter.name}
                        </span>
                      </p>
                      <p className="mt-1.5 rounded-box bg-surface-2 px-3 py-2 text-[0.82rem] leading-relaxed text-ink-2">
                        {report.reason}
                      </p>
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        {relativeTime(report.createdAt)}
                      </p>
                    </div>
                    <ResolveReport reportId={report.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="p-3.5">
      <p className="text-[0.76rem] font-medium text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="text-[0.72rem] text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

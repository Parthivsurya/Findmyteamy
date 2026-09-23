import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, btn } from "@/components/ui/button";
import { Card, CardBody, CardHead, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { ScoreBadge } from "@/components/ui/meter";
import { CompletenessCard } from "@/components/profile/completeness";
import { ParticipationBadge } from "@/components/profile/availability";
import { RoleChip } from "@/components/profile/skills";
import { TeamCard } from "@/components/teams/team-card";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  InboxIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import { updateAvailabilityAction } from "@/lib/actions/profile";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AVAILABILITY,
  AVAILABILITY_LABEL,
  type Availability,
} from "@/lib/enums";
import { buildTeam } from "@/lib/services/search";
import { countdown, daysSince, formatDateRange, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your profile, events, requests and suggested teammates.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const session = await requireOnboardedUser("/dashboard");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      skills: { include: { skill: true } },
      roles: { include: { role: true } },
      participations: {
        where: { event: { status: "APPROVED", endDate: { gte: new Date() } } },
        include: { event: true },
        orderBy: { event: { startDate: "asc" } },
      },
      ledTeams: {
        include: {
          event: { select: { name: true, slug: true } },
          leader: { select: { name: true, username: true, image: true } },
          slots: {
            include: {
              role: { select: { id: true, name: true } },
              filledBy: { select: { name: true, username: true, image: true } },
              requiredSkills: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      achievements: { orderBy: { createdAt: "desc" }, take: 3 },
      _count: {
        select: {
          achievements: { where: { status: "VERIFIED" } },
          inboxRequests: { where: { status: "PENDING" } },
        },
      },
    },
  });

  const [incoming, filledSlots] = await Promise.all([
    db.teamRequest.findMany({
      where: { toUserId: user.id, status: "PENDING" },
      include: {
        fromUser: { select: { name: true, username: true, image: true } },
        team: { select: { id: true, name: true, event: { select: { name: true } } } },
        slot: { include: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.teamSlot.findMany({
      where: { filledById: user.id },
      include: {
        role: { select: { name: true } },
        team: {
          include: {
            event: { select: { name: true, slug: true } },
            leader: { select: { name: true, username: true, image: true } },
            slots: {
              include: {
                role: { select: { id: true, name: true } },
                filledBy: { select: { name: true, username: true, image: true } },
                requiredSkills: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // Suggested teammates come from the first team that still has open roles.
  const recruitingTeam = user.ledTeams.find((team) =>
    team.slots.some((slot) => !slot.filledById),
  );

  const suggestions = recruitingTeam
    ? await buildTeam({
        slots: recruitingTeam.slots
          .filter((slot) => !slot.filledById)
          .map((slot) => ({
            roleId: slot.roleId,
            skillIds: slot.requiredSkills.map((s) => s.id),
            count: 1,
          })),
        eventId: recruitingTeam.eventId,
        viewerId: user.id,
        limitPerRole: 3,
        excludeUserIds: [
          user.id,
          ...recruitingTeam.slots
            .map((s) => s.filledById)
            .filter((id): id is string => Boolean(id)),
        ],
      })
    : [];

  const availabilityStale = daysSince(user.availabilityUpdatedAt) > 30;
  const memberTeams = filledSlots
    .map((slot) => slot.team)
    .filter((team) => team.leaderId !== user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ------------------------------------------------------ greeting */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {welcome ? `Welcome, ${user.name.split(" ")[0]}` : `Hello, ${user.name.split(" ")[0]}`}
          </h1>
          <p className="mt-1 text-[0.9rem] text-ink-muted">
            {welcome
              ? "Your profile is live. Here is what to do next."
              : "Your events, requests and the people worth inviting."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/team-builder" className={btn("primary", "md")}>
            <SparklesIcon className="size-4" />
            Team Builder
          </Link>
          <Link href={`/u/${user.username}`} className={btn("outline", "md")}>
            View public profile
          </Link>
        </div>
      </header>

      {welcome ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-ok/30 bg-ok-soft px-4 py-3">
          <CheckIcon className="size-4 shrink-0 text-ok" />
          <p className="flex-1 text-[0.87rem] text-ink-2">
            Profile created. Add an achievement and mark the events you are
            attending — both strongly affect who finds you.
          </p>
          <Link href="/settings/achievements" className={btn("secondary", "sm")}>
            Add achievement
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ------------------------------------------------- main column */}
        <div className="space-y-6">
          {/* pending requests */}
          <section>
            <SectionTitle
              action={
                <Link
                  href="/requests"
                  className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-brand hover:underline"
                >
                  All requests
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              }
            >
              Pending requests
              {user._count.inboxRequests > 0 ? (
                <Badge tone="brand" className="ml-2">
                  {user._count.inboxRequests}
                </Badge>
              ) : null}
            </SectionTitle>

            {incoming.length === 0 ? (
              <Card>
                <CardBody className="flex items-center gap-2.5 text-[0.85rem] text-ink-muted">
                  <InboxIcon className="size-4" />
                  Nothing waiting on you right now.
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {incoming.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar
                        name={request.fromUser.name}
                        image={request.fromUser.image}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.88rem]">
                          <Link
                            href={`/u/${request.fromUser.username}`}
                            className="font-semibold hover:text-brand"
                          >
                            {request.fromUser.name}
                          </Link>{" "}
                          <span className="text-ink-muted">
                            {request.type === "INVITE"
                              ? "invited you to"
                              : "asked to join"}
                          </span>{" "}
                          <Link
                            href={`/teams/${request.team.id}`}
                            className="font-semibold hover:text-brand"
                          >
                            {request.team.name}
                          </Link>
                        </p>
                        <p className="mt-0.5 text-[0.78rem] text-ink-muted">
                          {request.slot?.role.name ?? "Team member"}
                          {request.team.event ? ` · ${request.team.event.name}` : ""}
                          {" · "}
                          {relativeTime(request.createdAt)}
                        </p>
                        {request.message ? (
                          <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[0.82rem] leading-relaxed text-ink-2">
                            “{request.message}”
                          </p>
                        ) : null}
                      </div>
                      <Link href="/requests" className={btn("primary", "sm")}>
                        Respond
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* my events */}
          <section>
            <SectionTitle
              action={
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-brand hover:underline"
                >
                  Browse events
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              }
            >
              My events
            </SectionTitle>

            {user.participations.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="size-5" />}
                title="You are not attending any events yet"
                description="Mark an event as attending and set your status — that is how team leaders find people for a specific hackathon."
                action={
                  <Link href="/events" className={btn("primary", "md")}>
                    Find an event
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {user.participations.map((participation) => (
                  <Card key={participation.eventId} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/events/${participation.event.slug}`}
                        className="text-[0.9rem] font-semibold leading-snug hover:text-brand"
                      >
                        {participation.event.name}
                      </Link>
                      <Badge tone="lime">
                        {countdown(
                          participation.event.registrationDeadline ??
                            participation.event.startDate,
                        )}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-ink-muted">
                      <CalendarIcon className="size-3" />
                      {formatDateRange(
                        participation.event.startDate,
                        participation.event.endDate,
                      )}
                    </p>
                    <div className="mt-2.5">
                      <ParticipationBadge status={participation.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* teams */}
          {user.ledTeams.length || memberTeams.length ? (
            <section>
              <SectionTitle>My teams</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {user.ledTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    action={
                      team.slots.some((s) => !s.filledById) ? (
                        <Link
                          href={`/team-builder?team=${team.id}`}
                          className={btn("primary", "sm", "flex-1")}
                        >
                          Fill open roles
                        </Link>
                      ) : (
                        <Link
                          href={`/teams/${team.id}`}
                          className={btn("outline", "sm", "flex-1")}
                        >
                          Manage team
                        </Link>
                      )
                    }
                  />
                ))}
                {memberTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    action={
                      <Link
                        href={`/teams/${team.id}`}
                        className={btn("outline", "sm", "flex-1")}
                      >
                        View team
                      </Link>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* suggested teammates */}
          {suggestions.some((group) => group.candidates.length) ? (
            <section>
              <SectionTitle
                action={
                  recruitingTeam ? (
                    <Link
                      href={`/team-builder?team=${recruitingTeam.id}`}
                      className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-brand hover:underline"
                    >
                      Open Team Builder
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  ) : null
                }
              >
                Suggested for {recruitingTeam?.name}
              </SectionTitle>

              <Card>
                <CardBody className="space-y-4">
                  {suggestions
                    .filter((group) => group.candidates.length)
                    .map((group) => (
                      <div key={group.roleId}>
                        <div className="mb-2 flex items-center gap-2">
                          <RoleChip name={group.roleName} />
                          <span className="text-[0.75rem] text-ink-muted">
                            {group.candidates.length} suggested
                          </span>
                        </div>

                        <ul className="divide-y divide-[var(--line)]">
                          {group.candidates.map((candidate) => (
                            <li
                              key={candidate.id}
                              className="flex flex-wrap items-center gap-3 py-2"
                            >
                              <Avatar
                                name={candidate.name}
                                image={candidate.image}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/u/${candidate.username}`}
                                  className="block truncate text-[0.87rem] font-semibold hover:text-brand"
                                >
                                  {candidate.name}
                                </Link>
                                <p className="truncate text-[0.75rem] text-ink-muted">
                                  {candidate.reasons[0] ?? candidate.college}
                                </p>
                              </div>
                              <ScoreBadge score={candidate.score} showLabel={false} />
                              <Link
                                href={`/invite/${candidate.username}?team=${recruitingTeam!.id}`}
                                className={btn("secondary", "sm")}
                              >
                                Invite
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </CardBody>
              </Card>
            </section>
          ) : null}
        </div>

        {/* -------------------------------------------------- side column */}
        <aside className="space-y-6">
          <CompletenessCard
            score={user.profileCompleteness}
            input={{
              name: user.name,
              image: user.image,
              bio: user.bio,
              college: user.college,
              location: user.location,
              skillCount: user.skills.length,
              roleCount: user.roles.length,
              githubUrl: user.githubUrl,
              linkedinUrl: user.linkedinUrl,
              portfolioUrl: user.portfolioUrl,
            }}
          />

          {/* availability */}
          <Card>
            <CardHead
              title="Availability"
              description={
                availabilityStale
                  ? "Last updated over 30 days ago — please confirm."
                  : `Updated ${relativeTime(user.availabilityUpdatedAt)}`
              }
            />
            <CardBody>
              <form action={updateAvailabilityAction} className="space-y-2.5">
                <label htmlFor="availability" className="sr-only">
                  Availability
                </label>
                <select
                  id="availability"
                  name="availability"
                  defaultValue={user.availability}
                  className="field"
                >
                  {AVAILABILITY.map((option) => (
                    <option key={option} value={option}>
                      {AVAILABILITY_LABEL[option as Availability]}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  {availabilityStale ? "Confirm availability" : "Update"}
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* achievements */}
          <Card>
            <CardHead
              title="Achievements"
              description={`${user._count.achievements} verified`}
              action={
                <Link
                  href="/settings/achievements"
                  className="text-[0.8rem] font-semibold text-brand hover:underline"
                >
                  Manage
                </Link>
              }
            />
            <CardBody className="space-y-2">
              {user.achievements.length === 0 ? (
                <p className="flex items-start gap-2 text-[0.83rem] text-ink-muted">
                  <TrophyIcon className="mt-0.5 size-4 shrink-0" />
                  Add a hackathon result and upload proof — verified wins are the
                  strongest signal on your profile.
                </p>
              ) : (
                user.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <p className="min-w-0 truncate text-[0.83rem]">
                      {achievement.title}
                    </p>
                    <Badge
                      tone={
                        achievement.status === "VERIFIED"
                          ? "ok"
                          : achievement.status === "PENDING"
                            ? "warn"
                            : achievement.status === "REJECTED"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {achievement.status === "PENDING"
                        ? "Under review"
                        : achievement.status.charAt(0) +
                          achievement.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* quick links */}
          <Card>
            <CardHead title="Quick actions" />
            <CardBody className="grid gap-2">
              <Link href="/events/new" className={btn("outline", "sm", "justify-start")}>
                <CalendarIcon className="size-4" />
                List a new event
              </Link>
              <Link href="/search" className={btn("outline", "sm", "justify-start")}>
                <UsersIcon className="size-4" />
                Search people
              </Link>
              <Link href="/settings" className={btn("outline", "sm", "justify-start")}>
                Settings and privacy
              </Link>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

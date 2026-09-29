import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { TabLinks } from "@/components/ui/nav";
import { AttendForm } from "@/components/events/attend-form";
import { ModeBadge } from "@/components/events/event-card";
import { ParticipationBadge } from "@/components/profile/availability";
import { ProfileCard } from "@/components/profile/profile-card";
import { TeamCard } from "@/components/teams/team-card";
import {
  CalendarIcon,
  ClockIcon,
  ExternalIcon,
  MapPinIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEventPeople } from "@/lib/services/events";
import { listTeamsForEvent } from "@/lib/services/teams";
import { countdown, formatDate, formatDateRange, parseThemes } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await db.event.findUnique({
    where: { slug },
    select: { name: true, organizer: true, description: true, startDate: true },
  });

  if (!event) return { title: "Event not found" };

  return {
    title: event.name,
    description:
      event.description?.slice(0, 200) ??
      `${event.name} by ${event.organizer}. Find teammates and teams looking for members.`,
    openGraph: { title: event.name, type: "website" },
    alternates: { canonical: `/events/${slug}` },
  };
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab = "people" } = await searchParams;

  const event = await db.event.findUnique({
    where: { slug },
    include: { createdBy: { select: { name: true, username: true } } },
  });
  if (!event) notFound();

  const viewer = await getCurrentUser();

  // Nothing about the students is read for a signed-out visitor, rather than
  // read and then hidden in the markup.
  const [people, teams, myParticipation] = viewer
    ? await Promise.all([
        getEventPeople(event.id, viewer.id),
        listTeamsForEvent(event.id),
        db.eventParticipation.findUnique({
          where: { userId_eventId: { userId: viewer.id, eventId: event.id } },
          select: { status: true },
        }),
      ])
    : [[], [], null];

  const looking = people.filter((p) => p.status !== "IN_TEAM");
  const recruitingTeams = teams.filter((team) => !team.isComplete);
  const completeTeams = teams.filter((team) => team.isComplete);
  const themes = parseThemes(event.themes);
  const deadlinePassed = event.registrationDeadline
    ? new Date(event.registrationDeadline) < new Date()
    : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {event.status !== "APPROVED" ? (
        <div className="mb-5 rounded-box border border-warn/30 bg-warn-soft px-4 py-3 text-[0.85rem] text-warn">
          This event is <strong>{event.status.toLowerCase()}</strong> and is not
          publicly listed yet.
        </div>
      ) : null}

      {/* ---------------------------------------------------------- header */}
      <Card>
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={event.mode} />
                {event.registrationDeadline ? (
                  <Badge tone={deadlinePassed ? "neutral" : "warn"}>
                    <ClockIcon className="size-3" />
                    {deadlinePassed
                      ? "Registration closed"
                      : `Registration ${countdown(event.registrationDeadline)}`}
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
                {event.name}
              </h1>
              <p className="mt-1 text-[0.88rem] text-ink-muted">
                {event.organizer}
              </p>
            </div>

            {event.registrationLink ? (
              <a
                href={event.registrationLink}
                target="_blank"
                rel="noreferrer"
                className={btn("outline", "md")}
              >
                Register on official site
                <ExternalIcon className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <CardBody className="flex flex-wrap gap-x-8 gap-y-3">
          <Fact icon={<CalendarIcon className="size-4" />} label="Dates">
            {formatDateRange(event.startDate, event.endDate)}
          </Fact>
          {event.location ? (
            <Fact icon={<MapPinIcon className="size-4" />} label="Location">
              {event.location}
            </Fact>
          ) : null}
          <Fact icon={<UsersIcon className="size-4" />} label="Team size">
            {event.minTeamSize}-{event.maxTeamSize} people
          </Fact>
          {event.registrationDeadline ? (
            <Fact icon={<ClockIcon className="size-4" />} label="Register by">
              {formatDate(event.registrationDeadline)}
            </Fact>
          ) : null}
          {event.prize ? (
            <Fact icon={<TrophyIcon className="size-4" />} label="Prize">
              {event.prize}
            </Fact>
          ) : null}
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ------------------------------------------------- people + teams */}
        <div>
          {/* The event itself is public, but the students attending it are
              not. A visitor from outside the university can read what the
              hackathon is and when it runs, and has to sign in to see who
              is looking for a team. */}
          {viewer ? (
            <>
            <TabLinks
              className="mb-5"
              tabs={[
                {
                  href: `/events/${slug}?tab=people`,
                  label: "People looking for a team",
                  active: tab !== "teams",
                  count: looking.length,
                },
                {
                  href: `/events/${slug}?tab=teams`,
                  label: "Teams looking for members",
                  active: tab === "teams",
                  count: recruitingTeams.length,
                },
              ]}
            />

            {tab === "teams" ? (
              recruitingTeams.length === 0 ? (
                <EmptyState
                  title="No teams are recruiting yet"
                  description="Create a team for this event, list the roles you are missing, and Team Builder will find candidates for each one."
                  action={
                    <Link
                      href={
                        viewer
                          ? `/teams/new?event=${slug}`
                          : `/login?next=/teams/new?event=${slug}`
                      }
                      className={btn("primary", "md")}
                    >
                      <PlusIcon className="size-4" />
                      Create a team
                    </Link>
                  }
                />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {recruitingTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        compact
                        action={
                          <Link
                            href={`/teams/${team.id}`}
                            className={btn("primary", "sm", "flex-1")}
                          >
                            {viewer?.id === team.leaderId
                              ? "Manage team"
                              : "View and request to join"}
                          </Link>
                        }
                      />
                    ))}
                  </div>

                  {completeTeams.length ? (
                    <>
                      <h3 className="mb-3 mt-8 text-[0.8rem] font-medium text-ink-2">
                        Complete teams ({completeTeams.length})
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {completeTeams.map((team) => (
                          <TeamCard key={team.id} team={team} compact />
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              )
            ) : looking.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="size-5" />}
                title="Nobody has marked themselves as looking yet"
                description="Be the first. Mark yourself as attending and set your status to “looking for a team”, and leaders searching for this event will find you."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {looking.map((entry) => (
                  <ProfileCard
                    key={entry.user.id}
                    user={entry.user}
                    reasons={[
                      entry.status === "TEAM_LOOKING_FOR_MEMBERS"
                        ? "Leads a team that needs members"
                        : "Looking for a team at this event",
                    ]}
                    action={
                      viewer?.id === entry.user.id ? (
                        <span className="flex-1 text-center text-[0.78rem] text-ink-muted">
                          This is you
                        </span>
                      ) : (
                        <>
                          <Link
                            href={`/u/${entry.user.username}`}
                            className={btn("outline", "sm", "flex-1")}
                          >
                            Profile
                          </Link>
                          <Link
                            href={
                              viewer
                                ? `/invite/${entry.user.username}?event=${slug}`
                                : `/login?next=/invite/${entry.user.username}`
                            }
                            className={btn("primary", "sm", "flex-1")}
                          >
                            Invite
                          </Link>
                        </>
                      )
                    }
                  />
                ))}
              </div>
            )}
            </>
          ) : (
            <EmptyState
              title="Sign in to see who is attending"
              description={
                <>
                  The people and teams at this event are visible to Amrita
                  students only.
                </>
              }
              action={
                <Link
                  href={`/login?next=${encodeURIComponent(`/events/${slug}`)}`}
                  className={btn("primary")}
                >
                  Sign in
                </Link>
              }
            />
          )}
        </div>

        {/* ----------------------------------------------------- side rail */}
        <aside className="space-y-5">
          <Card>
            <CardHead title="Your status" />
            <CardBody>
              {viewer ? (
                <AttendForm
                  eventId={event.id}
                  slug={slug}
                  currentStatus={myParticipation?.status ?? null}
                />
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[0.85rem] text-ink-muted">
                    Sign in to mark yourself as attending and be found by team
                    leaders searching this event.
                  </p>
                  <Link
                    href={`/login?next=/events/${slug}`}
                    className={btn("primary", "md", "w-full")}
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {viewer && myParticipation ? (
                <div className="mt-4 border-t border-line pt-4">
                  <Link
                    href={`/teams/new?event=${slug}`}
                    className={btn("secondary", "sm", "w-full")}
                  >
                    <PlusIcon className="size-4" />
                    Create a team for this event
                  </Link>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {event.description ? (
            <Card>
              <CardHead title="About this event" />
              <CardBody>
                <p className="whitespace-pre-line text-[0.87rem] leading-relaxed text-ink-2">
                  {event.description}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {themes.length ? (
            <Card>
              <CardHead title="Themes" />
              <CardBody className="flex flex-wrap gap-1.5">
                {themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-box bg-surface-2 px-2 py-1 text-[0.78rem] text-ink-2"
                  >
                    {theme}
                  </span>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHead title="At a glance" />
            <CardBody className="space-y-2 text-[0.85rem]">
              {viewer ? (
                <Row label="Attending" value={people.length} />
              ) : null}
              <Row label="Looking for a team" value={looking.length} />
              <Row label="Teams recruiting" value={recruitingTeams.length} />
              <Row label="Complete teams" value={completeTeams.length} />
              {event.createdBy ? (
                <p className="border-t border-line pt-2 text-[0.78rem] text-ink-muted">
                  Listed by{" "}
                  <Link
                    href={`/u/${event.createdBy.username}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {event.createdBy.name}
                  </Link>
                </p>
              ) : null}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-brand">{icon}</span>
      <div>
        <dt className="text-[0.76rem] font-medium text-ink-muted">
          {label}
        </dt>
        <dd className="text-[0.87rem] font-medium">{children}</dd>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

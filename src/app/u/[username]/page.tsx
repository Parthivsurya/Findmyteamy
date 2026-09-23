import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card, CardBody, CardHead, SectionTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { AchievementCard } from "@/components/profile/achievement";
import { AvailabilityBadge, ParticipationBadge } from "@/components/profile/availability";
import { RoleChip, SkillsByCategory } from "@/components/profile/skills";
import {
  CalendarIcon,
  EditIcon,
  ClockIcon,
  ExternalIcon,
  GithubIcon,
  LayersIcon,
  LinkIcon,
  LinkedinIcon,
  MapPinIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
  VerifiedIcon,
} from "@/components/icons";
import {
  BRANCHES,
  CAMPUSES,
  SCHOOLS,
  batchLabel,
  studyYearLabel,
} from "@/lib/amrita";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateRange, relativeTime } from "@/lib/utils";

type Props = { params: Promise<{ username: string }> };

async function getProfile(username: string) {
  return db.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      skills: {
        include: { skill: { select: { id: true, name: true, category: true } } },
      },
      roles: { include: { role: { select: { id: true, name: true } } } },
      achievements: {
        // Rejected achievements never appear on a public profile.
        where: { status: { not: "REJECTED" } },
        orderBy: [{ status: "asc" }, { date: "desc" }],
      },
      participations: {
        where: { event: { status: "APPROVED" } },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
              endDate: true,
              mode: true,
            },
          },
        },
        orderBy: { event: { startDate: "asc" } },
      },
      ledTeams: {
        include: {
          event: { select: { name: true, slug: true } },
          slots: { select: { filledById: true } },
        },
      },
      filledSlots: {
        include: {
          role: { select: { name: true } },
          team: {
            include: { event: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      name: true,
      bio: true,
      college: true,
      username: true,
      skills: { include: { skill: { select: { name: true } } }, take: 5 },
      _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
    },
  });

  if (!user) return { title: "Profile not found" };

  const skills = user.skills.map((s) => s.skill.name).join(", ");
  const wins = user._count.achievements;

  return {
    title: `${user.name} (@${user.username})`,
    description:
      user.bio ??
      `${user.name}${user.college ? ` from ${user.college}` : ""}${
        skills ? ` — ${skills}` : ""
      }${wins ? ` · ${wins} verified hackathon wins` : ""}.`,
    openGraph: {
      title: `${user.name} on FindMyTeammate`,
      description: user.bio ?? skills,
      type: "profile",
    },
    alternates: { canonical: `/u/${user.username}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([getProfile(username), getCurrentUser()]);

  if (!profile) notFound();

  const isOwner = viewer?.id === profile.id;

  // Contact details are shared only once a team request has been accepted.
  const hasAcceptedRequest = viewer
    ? (await db.teamRequest.count({
        where: {
          status: "ACCEPTED",
          OR: [
            { fromUserId: viewer.id, toUserId: profile.id },
            { fromUserId: profile.id, toUserId: viewer.id },
          ],
        },
      })) > 0
    : false;
  const canSeeContact = isOwner || hasAcceptedRequest;

  const verified = profile.achievements.filter((a) => a.status === "VERIFIED");
  const others = profile.achievements.filter((a) => a.status !== "VERIFIED");
  const upcoming = profile.participations.filter(
    (p) => new Date(p.event.endDate) >= new Date(),
  );

  const teams = [
    ...profile.ledTeams.map((team) => ({
      id: team.id,
      name: team.name,
      role: "Team lead",
      event: team.event,
      isComplete: team.isComplete,
    })),
    ...profile.filledSlots.map((slot) => ({
      id: slot.team.id,
      name: slot.team.name,
      role: slot.role.name,
      event: slot.team.event,
      isComplete: slot.team.isComplete,
    })),
  ].filter(
    // A leader who also fills a slot should appear once.
    (team, index, all) => all.findIndex((t) => t.id === team.id) === index,
  );

  const links = [
    {
      href: profile.githubUrl,
      label: "GitHub",
      icon: <GithubIcon className="size-4" />,
      show: profile.showGithub,
    },
    {
      href: profile.linkedinUrl,
      label: "LinkedIn",
      icon: <LinkedinIcon className="size-4" />,
      show: profile.showLinkedin,
    },
    {
      href: profile.portfolioUrl,
      label: "Portfolio",
      icon: <LinkIcon className="size-4" />,
      show: profile.showPortfolio,
    },
  ].filter((link) => link.href && (link.show || isOwner));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* --------------------------------------------------------- header */}
      <Card className="overflow-hidden">
        <div className="brand-gradient h-20 sm:h-24" aria-hidden />

        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-12">
            <div className="flex items-end gap-4">
              <Avatar
                name={profile.name}
                image={profile.image}
                size="xl"
                ring
                className="shadow-float"
              />
              <div className="pb-1">
                <h1 className="text-xl font-bold sm:text-2xl">{profile.name}</h1>
                <p className="text-[0.85rem] text-ink-muted">@{profile.username}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {isOwner ? (
                <>
                  <Link href="/settings/profile" className={btn("outline", "md")}>
                    <EditIcon className="size-4" />
                    Edit profile
                  </Link>
                  <Link href="/settings/skills" className={btn("secondary", "md")}>
                    Skills and roles
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={
                      viewer
                        ? `/invite/${profile.username}`
                        : `/login?next=/invite/${profile.username}`
                    }
                    className={btn("primary", "md")}
                  >
                    <UsersIcon className="size-4" />
                    Invite to a team
                  </Link>
                  {viewer ? (
                    <Link
                      href={`/report/${profile.username}`}
                      className={btn("ghost", "md")}
                      title="Report or block this person"
                    >
                      <ShieldIcon className="size-4" />
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AvailabilityBadge availability={profile.availability} />
            {verified.length > 0 ? (
              <Badge tone="lime">
                <VerifiedIcon className="size-3" />
                {verified.length} verified {verified.length === 1 ? "win" : "wins"}
              </Badge>
            ) : null}
            {profile.role === "ADMIN" ? <Badge tone="brand">Admin</Badge> : null}
            <span className="text-[0.78rem] text-ink-muted">
              Active {relativeTime(profile.lastActiveAt)}
            </span>
          </div>

          {profile.bio ? (
            <p className="mt-4 max-w-3xl text-[0.92rem] leading-relaxed text-ink-2">
              {profile.bio}
            </p>
          ) : null}

          {/* Academic identity, read from the student's Amrita address. */}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.85rem] text-ink-2">
            {profile.branchCode ? (
              <div className="flex items-center gap-1.5">
                <LayersIcon className="size-3.5 text-ink-muted" />
                <dd>
                  <span className="font-medium">
                    {profile.branchCode.toUpperCase()}
                  </span>
                  {BRANCHES[profile.branchCode] ? (
                    <span className="text-ink-muted">
                      {" "}
                      — {BRANCHES[profile.branchCode]}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}

            {studyYearLabel(profile.joiningYear, profile.programYears) ? (
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5 text-ink-muted" />
                <dd>
                  <span className="font-medium">
                    {studyYearLabel(profile.joiningYear, profile.programYears)}
                  </span>
                  <span className="text-ink-muted">
                    {" "}
                    · {batchLabel(profile.joiningYear, profile.programYears)}
                  </span>
                </dd>
              </div>
            ) : null}

            {profile.schoolCode ? (
              <div className="flex items-center gap-1.5">
                <UsersIcon className="size-3.5 text-ink-muted" />
                <dd>{SCHOOLS[profile.schoolCode] ?? profile.schoolCode.toUpperCase()}</dd>
              </div>
            ) : null}

            {profile.campusCode ? (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 text-ink-muted" />
                <dd>
                  {CAMPUSES[profile.campusCode] ?? profile.location ?? "Amrita"}
                </dd>
              </div>
            ) : profile.location ? (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 text-ink-muted" />
                <dd>{profile.location}</dd>
              </div>
            ) : null}

            {canSeeContact ? (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-muted">Email</span>
                <dd className="break-all font-mono text-[0.78rem] font-medium">
                  {profile.email}
                </dd>
              </div>
            ) : null}
          </dl>

          {links.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href!}
                  target="_blank"
                  rel="noreferrer me"
                  className={btn("outline", "sm")}
                >
                  {link.icon}
                  {link.label}
                  {isOwner && !link.show ? (
                    <span className="text-[0.68rem] text-ink-muted">(hidden)</span>
                  ) : null}
                  <ExternalIcon className="size-3 opacity-60" />
                </a>
              ))}
            </div>
          ) : null}

          {isOwner ? (
            <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3">
              <div className="flex items-center justify-between text-[0.8rem]">
                <span className="font-semibold">Profile completeness</span>
                <span className="font-bold tabular-nums text-brand">
                  {profile.profileCompleteness}%
                </span>
              </div>
              <Meter
                value={profile.profileCompleteness}
                className="mt-2"
                label="Profile completeness"
              />
              {profile.profileCompleteness < 60 ? (
                <p className="mt-2 text-[0.78rem] text-ink-muted">
                  Profiles under 60% are ranked lower in search.{" "}
                  <Link href="/dashboard" className="font-medium text-brand hover:underline">
                    See what is missing
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ------------------------------------------------- skills + roles */}
        <div className="space-y-6">
          <section>
            <SectionTitle>Skills</SectionTitle>
            {profile.skills.length ? (
              <Card>
                <CardBody>
                  <SkillsByCategory skills={profile.skills} />
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody className="text-[0.85rem] text-ink-muted">
                  No skills listed yet.
                </CardBody>
              </Card>
            )}
          </section>

          {profile.roles.length ? (
            <section>
              <SectionTitle>Roles they can play</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {profile.roles.map((entry) => (
                  <RoleChip key={entry.role.id} name={entry.role.name} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle
              action={
                isOwner ? (
                  <Link
                    href="/settings/achievements"
                    className="text-[0.82rem] font-semibold text-brand hover:underline"
                  >
                    Add achievement
                  </Link>
                ) : null
              }
            >
              Achievements
            </SectionTitle>

            {profile.achievements.length === 0 ? (
              <Card>
                <CardBody className="flex items-center gap-2 text-[0.85rem] text-ink-muted">
                  <TrophyIcon className="size-4" />
                  No achievements added yet.
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Verified first — they are the ones search filters count. */}
                {[...verified, ...others].map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    showStatus={isOwner || achievement.status === "VERIFIED"}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------- events + teams */}
        <div className="space-y-6">
          <Card>
            <CardHead
              title="Upcoming events"
              description={
                upcoming.length
                  ? `Attending ${upcoming.length} ${upcoming.length === 1 ? "event" : "events"}`
                  : "Not attending anything yet"
              }
            />
            <CardBody className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-[0.85rem] text-ink-muted">
                  {isOwner ? (
                    <>
                      Mark yourself as attending an event so team leaders can
                      find you.{" "}
                      <Link href="/events" className="font-medium text-brand hover:underline">
                        Browse events
                      </Link>
                    </>
                  ) : (
                    "This person has not marked any events yet."
                  )}
                </p>
              ) : (
                upcoming.map((participation) => (
                  <div
                    key={participation.event.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/events/${participation.event.slug}`}
                        className="block text-[0.87rem] font-semibold hover:text-brand"
                      >
                        {participation.event.name}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
                        <CalendarIcon className="size-3" />
                        {formatDateRange(
                          participation.event.startDate,
                          participation.event.endDate,
                        )}
                      </p>
                    </div>
                    <ParticipationBadge status={participation.status} />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {teams.length ? (
            <Card>
              <CardHead title="Teams" description={`${teams.length} in total`} />
              <CardBody className="space-y-2.5">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/teams/${team.id}`}
                        className="block text-[0.87rem] font-semibold hover:text-brand"
                      >
                        {team.name}
                      </Link>
                      <p className="truncate text-[0.75rem] text-ink-muted">
                        {team.role}
                        {team.event ? ` · ${team.event.name}` : ""}
                      </p>
                    </div>
                    {team.isComplete ? (
                      <Badge tone="ok">Complete</Badge>
                    ) : (
                      <Badge tone="warn">Recruiting</Badge>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {!canSeeContact && !isOwner ? (
            <Card>
              <CardBody className="flex gap-2.5 text-[0.82rem] text-ink-muted">
                <ShieldIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                <p>
                  Email addresses and phone numbers stay hidden until a team
                  request between you two is accepted.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

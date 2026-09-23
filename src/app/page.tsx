import Link from "next/link";
import { btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/card";
import { EventCard } from "@/components/events/event-card";
import { ProfileCard } from "@/components/profile/profile-card";
import {
  ArrowRightIcon,
  CheckIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
  VerifiedIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const revalidate = 60;

async function getLandingData() {
  const [events, people, userCount, teamCount, verifiedCount] = await Promise.all([
    db.event.findMany({
      where: { status: "APPROVED", endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 3,
      include: {
        _count: {
          select: {
            participations: { where: { status: "LOOKING_FOR_TEAM" } },
            teams: true,
          },
        },
      },
    }),
    db.user.findMany({
      where: { availability: "OPEN", onboarded: true },
      orderBy: [{ profileCompleteness: "desc" }, { lastActiveAt: "desc" }],
      take: 4,
      include: {
        skills: { include: { skill: true }, take: 4 },
        roles: { include: { role: true } },
        _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
      },
    }),
    db.user.count(),
    db.team.count(),
    db.achievement.count({ where: { status: "VERIFIED" } }),
  ]);

  return { events, people, userCount, teamCount, verifiedCount };
}

export default async function LandingPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getLandingData()]);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="hero-grid relative overflow-hidden brand-gradient">
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(255_255_255/0.16)] px-3 py-1 text-[0.78rem] font-semibold text-white ring-1 ring-inset ring-[rgb(255_255_255/0.28)]">
              <SparklesIcon className="size-3.5" />
              Built for hackathons, not hiring
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-6xl">
              Find the right teammates for{" "}
              <span className="text-[#F2F7A0]">hackathons</span> and competitions.
            </h1>

            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-[rgb(255_255_255/0.88)]">
              Search people by skill, role, availability and verified wins. Pick
              the roles your team is missing, and invite candidates directly for
              the exact event you are attending.
            </p>

            {/* Straight into search — the fastest possible first action. */}
            <form
              action="/search"
              method="get"
              className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="landing-q" className="sr-only">
                Search by skill, role or college
              </label>
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="landing-q"
                  name="q"
                  placeholder="Try “React”, “ML engineer” or a college name"
                  className="field h-12 pl-9 shadow-float"
                />
              </div>
              <button type="submit" className={btn("lime", "lg", "shadow-float")}>
                Search people
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Stat value={data.userCount} label="profiles" />
              <Stat value={data.verifiedCount} label="verified achievements" />
              <Stat value={data.teamCount} label="teams formed" />
              {!user ? (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-white underline decoration-[rgb(255_255_255/0.4)] underline-offset-4 hover:decoration-white"
                >
                  Create your profile
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- how it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Three steps from solo to a complete team
          </h2>
          <p className="mt-3 text-[0.95rem] text-ink-muted">
            Good search needs good data, so profiles use structured skills and
            roles instead of free text — which is what makes the matching work.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Build a real profile",
              body: "Add your skills with proficiency levels, the roles you can play, and your hackathon results. Takes about five minutes.",
              icon: <UsersIcon className="size-5" />,
            },
            {
              step: "02",
              title: "Get verified",
              body: "Upload a certificate for each win. An admin checks it, and your profile gets a verified badge that search filters actually count.",
              icon: <VerifiedIcon className="size-5" />,
            },
            {
              step: "03",
              title: "Fill your open roles",
              body: "Tell Team Builder which roles you need. It returns ranked candidates per role, free for that event, ready to invite.",
              icon: <SparklesIcon className="size-5" />,
            },
          ].map((item) => (
            <li key={item.step}>
              <Card className="h-full p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    {item.icon}
                  </span>
                  <span className="font-mono text-[0.78rem] font-bold text-line-strong">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-4 text-[0.98rem] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[0.87rem] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------- features */}
      <section className="border-y border-line bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Why teams end up unbalanced
              </h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                Most people only know their own classmates, who tend to have the
                same skills they do. So teams end up with four frontend
                developers and nobody to design, deploy or present. Every feature
                here exists to fix one part of that.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "Structured skills, so “React”, “ReactJS” and “react.js” are one thing",
                  "Availability that says who is actually free, and for which event",
                  "Verified wins, so badges mean something",
                  "Role-slot search instead of one skill at a time",
                  "Contact details stay hidden until a request is accepted",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[0.9rem]">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-ok" />
                    <span className="text-ink-2">{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/team-builder" className={btn("primary", "md")}>
                  Open Team Builder
                </Link>
                <Link href="/events" className={btn("outline", "md")}>
                  Browse events
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Skill-based discovery",
                  body: "Filter by skill, minimum level, role, college, city and event — then sort by best match, most wins or recent activity.",
                },
                {
                  title: "Match score you can read",
                  body: "Every candidate shows a 0–100 score, and the reasons behind it: required skills held, role fit, availability and verified wins.",
                },
                {
                  title: "Event-centred",
                  body: "Each event page lists people looking for a team and teams looking for members, with a countdown to the deadline.",
                },
                {
                  title: "Two-way team formation",
                  body: "Leaders invite candidates into a specific role slot; solo participants request to join one. Filled slots close automatically.",
                },
              ].map((feature) => (
                <Card key={feature.title} className="p-4">
                  <h3 className="text-[0.9rem] font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-muted">
                    {feature.body}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- events */}
      {data.events.length ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionTitle
            action={
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-brand hover:underline"
              >
                All events
                <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            Upcoming events
          </SectionTitle>

          <div className="grid gap-4 md:grid-cols-3">
            {data.events.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  lookingCount: event._count.participations,
                  teamCount: event._count.teams,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------------- people */}
      {data.people.length ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <SectionTitle
            action={
              <Link
                href="/search"
                className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-brand hover:underline"
              >
                Search everyone
                <ArrowRightIcon className="size-3.5" />
              </Link>
            }
          >
            Open to teams right now
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.people.map((person) => (
              <ProfileCard
                key={person.id}
                user={{
                  id: person.id,
                  name: person.name,
                  username: person.username,
                  image: person.image,
                  college: person.college,
                  location: person.location,
                  availability: person.availability,
                  verifiedWins: person._count.achievements,
                  topSkills: person.skills.map((s) => ({
                    id: s.skill.id,
                    name: s.skill.name,
                    level: s.level,
                  })),
                  roles: person.roles.map((r) => r.role.name),
                }}
                action={
                  <Link
                    href={`/u/${person.username}`}
                    className={btn("outline", "sm", "w-full")}
                  >
                    View profile
                  </Link>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ cta */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="hero-grid relative overflow-hidden rounded-2xl brand-gradient px-6 py-12 text-center sm:px-12">
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
            Your next team is one search away
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[0.95rem] text-[rgb(255_255_255/0.88)]">
            Create a profile, mark yourself available, and let team leaders find
            you — or open Team Builder and fill the roles you are missing.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className={btn("lime", "lg", "shadow-float")}
            >
              {user ? "Go to dashboard" : "Create your profile"}
            </Link>
            <Link
              href="/search"
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[rgb(255_255_255/0.45)] px-6 text-[0.95rem] font-semibold text-white transition-colors hover:bg-[rgb(255_255_255/0.14)]"
            >
              Find people
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-[0.78rem] text-[rgb(255_255_255/0.75)]">{label}</div>
    </div>
  );
}

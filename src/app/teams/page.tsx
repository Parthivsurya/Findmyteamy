import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { SectionTitle } from "@/components/ui/card";
import { TeamCard } from "@/components/teams/team-card";
import { LayersIcon, PlusIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { listTeamsForUser } from "@/lib/services/teams";

export const metadata: Metadata = {
  title: "My teams",
  robots: { index: false },
};

export default async function TeamsPage() {
  const user = await requireOnboardedUser("/teams");
  const teams = await listTeamsForUser(user.id);

  const leading = teams.filter((team) => team.leaderId === user.id);
  const joined = teams.filter((team) => team.leaderId !== user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My teams</h1>
          <p className="mt-1.5 text-[0.9rem] text-ink-muted">
            Teams you lead, and teams you have joined.
          </p>
        </div>
        <Link href="/teams/new" className={btn("primary", "md")}>
          <PlusIcon className="size-4" />
          Create a team
        </Link>
      </header>

      {teams.length === 0 ? (
        <EmptyState
          icon={<LayersIcon className="size-5" />}
          title="You are not on a team yet"
          description="Create one for an event and list the roles you need, or browse an event page and ask to join a team that is recruiting."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/teams/new" className={btn("primary", "md")}>
                Create a team
              </Link>
              <Link href="/events" className={btn("outline", "md")}>
                Browse events
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          {leading.length ? (
            <section>
              <SectionTitle>Teams I lead</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {leading.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    action={
                      team.slots.some((slot) => !slot.filledById) ? (
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
              </div>
            </section>
          ) : null}

          {joined.length ? (
            <section>
              <SectionTitle>Teams I have joined</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {joined.map((team) => (
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
        </div>
      )}
    </div>
  );
}

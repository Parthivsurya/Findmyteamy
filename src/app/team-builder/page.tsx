import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { ProfileCard } from "@/components/profile/profile-card";
import { RoleChip, SkillChip } from "@/components/profile/skills";
import { TeamBuilderForm, type BuilderSlot } from "@/components/search/team-builder-form";
import { SparklesIcon, UsersIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoles, getSkills } from "@/lib/services/catalog";
import { buildTeam } from "@/lib/services/search";

export const metadata: Metadata = {
  title: "Team Builder",
  description:
    "Describe the team you need, one row per open role, and get ranked candidates for each role slot.",
};

/** Decodes "roleId:skillA,skillB|roleId2:" back into builder rows. */
function parseSlots(value: string | undefined): BuilderSlot[] {
  if (!value) return [];
  return value
    .split("|")
    .map((chunk) => {
      const [roleId, skillList = ""] = chunk.split(":");
      if (!roleId) return null;
      return {
        roleId,
        skillIds: skillList.split(",").map((s) => s.trim()).filter(Boolean),
      };
    })
    .filter((slot): slot is BuilderSlot => slot !== null)
    .slice(0, 6);
}

export default async function TeamBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ slots?: string; event?: string; team?: string }>;
}) {
  const { slots: slotsParam, event: eventSlug, team: teamId } = await searchParams;

  // Ranks real students against each open role, so it is signed in only.
  const user = await requireOnboardedUser("/team-builder");

  const [roles, skills, events] = await Promise.all([
    getRoles(),
    getSkills(),
    db.event.findMany({
      where: { status: "APPROVED", endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  // Coming from a team page, the open roles are already known.
  const team = teamId
    ? await db.team.findUnique({
        where: { id: teamId },
        include: {
          event: { select: { id: true, name: true, slug: true } },
          slots: {
            include: {
              role: { select: { id: true, name: true } },
              requiredSkills: { select: { id: true } },
            },
          },
        },
      })
    : null;

  const prefilled: BuilderSlot[] = team
    ? team.slots
        .filter((slot) => !slot.filledById)
        .map((slot) => ({
          roleId: slot.roleId,
          skillIds: slot.requiredSkills.map((s) => s.id),
        }))
    : [];

  const requested = parseSlots(slotsParam);
  const activeSlots = requested.length ? requested : prefilled;

  const event = eventSlug
    ? await db.event.findFirst({
        where: { OR: [{ slug: eventSlug }, { id: eventSlug }] },
        select: { id: true, name: true, slug: true },
      })
    : (team?.event ?? null);

  // People already on the team should not be offered again.
  const alreadyOnTeam = team
    ? [
        team.leaderId,
        ...team.slots.map((s) => s.filledById).filter((id): id is string => Boolean(id)),
      ]
    : [];

  const groups = activeSlots.length
    ? await buildTeam({
        slots: activeSlots.map((slot) => ({ ...slot, count: 1 })),
        eventId: event?.id ?? null,
        viewerId: user.id,
        limitPerRole: 6,
        excludeUserIds: alreadyOnTeam,
      })
    : [];

  const skillNames = new Map(skills.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[1.35rem] font-medium tracking-tight">Team Builder</h1>
        <p className="mt-1.5 max-w-2xl text-[0.9rem] text-ink-muted">
          Instead of searching one skill at a time, describe the team you need.
          Each open role gets its own ranked shortlist, so a designer is never
          compared against an ML engineer.
        </p>

        {team ? (
          <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-box border border-line bg-surface px-3 py-2 text-[0.83rem]">
            Filling open roles for{" "}
            <Link
              href={`/teams/${team.id}`}
              className="font-semibold text-brand hover:underline"
            >
              {team.name}
            </Link>
            {team.event ? (
              <>
                <span className="text-ink-muted">·</span>
                <Link
                  href={`/events/${team.event.slug}`}
                  className="text-ink-2 hover:text-brand"
                >
                  {team.event.name}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <TeamBuilderForm
            roles={roles}
            skills={skills}
            events={events}
            defaultSlots={activeSlots}
            defaultEvent={event?.slug}
            teamId={team?.id}
          />
        </aside>

        <section>
          {groups.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="size-5" />}
              title="Describe the team you need"
              description="Add the roles you are missing (one ML engineer and one UI/UX designer, say) and optionally the skills each should bring. You get a separate ranked list per role."
              action={
                <Link href="/search" className={btn("outline", "md")}>
                  Or search everyone instead
                </Link>
              }
            />
          ) : (
            <div className="space-y-8">
              {groups.map((group, index) => {
                // When filling a real team, map this role back to its open slot.
                const openSlot = team?.slots.find(
                  (slot) => !slot.filledById && slot.roleId === group.roleId,
                );

                return (
                  <div key={`${group.roleId}-${index}`}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-box bg-brand text-[0.7rem] font-bold text-white">
                          {index + 1}
                        </span>
                        <RoleChip name={group.roleName} />
                        {group.skillIds.map((id) => (
                          <SkillChip key={id} name={skillNames.get(id) ?? id} />
                        ))}
                      </div>
                      <span className="text-[0.8rem] text-ink-muted">
                        {group.candidates.length
                          ? `${group.candidates.length} candidate${group.candidates.length === 1 ? "" : "s"}`
                          : "No candidates yet"}
                      </span>
                    </div>

                    {group.candidates.length === 0 ? (
                      <p className="rounded-box border border-dashed border-line-strong px-4 py-6 text-center text-[0.85rem] text-ink-muted">
                        Nobody matches this role yet. Try removing a required
                        skill, or widen the event filter.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {group.candidates.map((candidate) => (
                          <ProfileCard
                            key={candidate.id}
                            user={candidate}
                            score={candidate.score}
                            reasons={candidate.reasons}
                            highlightSkillIds={new Set(group.skillIds)}
                            action={
                              <>
                                <Link
                                  href={`/u/${candidate.username}`}
                                  className={btn("outline", "sm", "flex-1")}
                                >
                                  Profile
                                </Link>
                                <Link
                                  href={
                                    user
                                      ? inviteHref(candidate.username, {
                                          team: team?.id,
                                          slot: openSlot?.id,
                                          event: event?.slug,
                                        })
                                      : `/login?next=/invite/${candidate.username}`
                                  }
                                  className={btn("primary", "sm", "flex-1")}
                                >
                                  Invite
                                </Link>
                              </>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function inviteHref(
  username: string,
  params: { team?: string; slot?: string; event?: string },
): string {
  const search = new URLSearchParams();
  if (params.team) search.set("team", params.team);
  if (params.slot) search.set("slot", params.slot);
  if (params.event) search.set("event", params.event);
  const query = search.toString();
  return `/invite/${username}${query ? `?${query}` : ""}`;
}

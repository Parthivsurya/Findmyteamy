import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Pagination } from "@/components/ui/nav";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProfileCard } from "@/components/profile/profile-card";
import { UsersIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoles, getSkills } from "@/lib/services/catalog";
import { searchPeople } from "@/lib/services/search";
import { cn, pluralize, withParams } from "@/lib/utils";
import { searchQuerySchema } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Find teammates",
  description:
    "Search people by skill, proficiency level, role, availability, event and verified hackathon wins.",
};

const SORTS = [
  { value: "match", label: "Best match" },
  { value: "wins", label: "Most wins" },
  { value: "recent", label: "Recently active" },
] as const;

type RawParams = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const raw = await searchParams;

  // Signed in only. This page lists real students by name, branch and batch,
  // so it is not something a visitor from outside the university should be
  // able to read. The whole query string is carried into `next`, so a search
  // typed on the home page while signed out is still run after signing in
  // rather than being silently dropped.
  const back = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      value === undefined
        ? []
        : Array.isArray(value)
          ? value.map((one) => [key, one] as [string, string])
          : [[key, value] as [string, string]],
    ),
  ).toString();
  const user = await requireOnboardedUser(back ? `/search?${back}` : "/search");

  const parsed = searchQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});

  const [skills, roles, events, branchRows, yearRows] = await Promise.all([
    getSkills(),
    getRoles(),
    db.event.findMany({
      where: { status: "APPROVED", endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    // Offer only the branches and batches that actually exist here.
    db.user.findMany({
      where: { branchCode: { not: null }, onboarded: true },
      distinct: ["branchCode"],
      select: { branchCode: true },
      orderBy: { branchCode: "asc" },
    }),
    db.user.findMany({
      where: { joiningYear: { not: null }, onboarded: true },
      distinct: ["joiningYear"],
      select: { joiningYear: true },
      orderBy: { joiningYear: "desc" },
    }),
  ]);

  const branches = branchRows
    .map((row) => row.branchCode)
    .filter((code): code is string => Boolean(code));
  const years = yearRows
    .map((row) => row.joiningYear)
    .filter((year): year is number => year !== null);

  const search = await searchPeople(query, user.id);
  const highlight = new Set(search.skillIds);
  const activeEvent = events.find((e) => e.id === search.eventId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Find teammates</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Search by skill, role, availability and verified track record. Every
          result shows a match score and why it matched.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FilterPanel
            skills={skills}
            roles={roles}
            events={events}
            query={query}
            skillIds={search.skillIds}
            branches={branches}
            years={years}
            signedIn={Boolean(user)}
          />
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.88rem] text-ink-2">
              <strong className="font-semibold text-ink">{search.total}</strong>{" "}
              {search.total === 1 ? "person" : "people"} found
              {activeEvent ? (
                <>
                  {" attending "}
                  <Link
                    href={`/events/${activeEvent.slug}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {activeEvent.name}
                  </Link>
                </>
              ) : null}
            </p>

            <div
              className="flex items-center gap-1 rounded-box border border-line bg-surface p-0.5"
              role="group"
              aria-label="Sort results"
            >
              {SORTS.map((sort) => (
                <Link
                  key={sort.value}
                  href={withParams("/search", raw, { sort: sort.value, page: null })}
                  aria-current={query.sort === sort.value ? "true" : undefined}
                  className={cn(
                    "rounded-box px-2.5 py-1 text-[0.78rem] font-medium transition-colors",
                    query.sort === sort.value
                      ? "bg-brand-soft text-brand"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {sort.label}
                </Link>
              ))}
            </div>
          </div>

          {search.results.length === 0 ? (
            <EmptyState
              title="No one matches those filters yet"
              description={
                <>
                  Try removing a filter, switching skill matching from{" "}
                  <strong>all</strong> to <strong>any</strong>, or widening the
                  minimum skill level. New profiles are added as each event
                  approaches.
                </>
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/search" className={btn("primary", "md")}>
                    Clear filters
                  </Link>
                  <Link href="/events" className={btn("outline", "md")}>
                    Browse events
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {search.results.map((candidate) => (
                  <ProfileCard
                    key={candidate.id}
                    user={candidate}
                    score={candidate.score}
                    reasons={candidate.reasons}
                    highlightSkillIds={highlight}
                    action={
                      <>
                        <Link
                          href={`/u/${candidate.username}`}
                          className={btn("outline", "sm", "flex-1")}
                        >
                          View profile
                        </Link>
                        <Link
                          href={
                            user
                              ? `/invite/${candidate.username}${
                                  activeEvent ? `?event=${activeEvent.slug}` : ""
                                }`
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

              <Pagination
                page={search.page}
                totalPages={search.totalPages}
                makeHref={(page) => withParams("/search", raw, { page })}
              />

              <p className="mt-6 flex items-center justify-center gap-2 text-[0.78rem] text-ink-muted">
                <UsersIcon className="size-3.5" />
                Showing {pluralize(search.results.length, "result")} of{" "}
                {search.total} · people marked “Not available” are hidden
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

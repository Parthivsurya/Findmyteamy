import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Pagination, TabLinks } from "@/components/ui/nav";
import { EventCard } from "@/components/events/event-card";
import { CalendarIcon, CheckIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { EVENT_MODES, EVENT_MODE_LABEL, type EventMode } from "@/lib/enums";
import { listEvents } from "@/lib/services/events";
import { cn, withParams } from "@/lib/utils";
import { eventListQuerySchema } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Hackathons and competitions",
  description:
    "Browse upcoming hackathons and competitions, see who is looking for a team, and find teams looking for members.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = eventListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : eventListQuerySchema.parse({});
  const submitted = raw.submitted === "1";

  const [user, listing] = await Promise.all([
    getCurrentUser(),
    listEvents({
      q: query.q,
      mode: query.mode,
      when: query.when,
      page: query.page,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="mt-1.5 text-[0.9rem] text-ink-muted">
            Every event page lists people looking for a team and teams looking
            for members.
          </p>
        </div>

        <Link
          href={user ? "/events/new" : "/login?next=/events/new"}
          className={btn("primary", "md")}
        >
          <PlusIcon className="size-4" />
          List an event
        </Link>
      </header>

      {submitted ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-card border border-ok/30 bg-ok-soft px-4 py-3">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-ok" />
          <p className="text-[0.87rem] text-ink-2">
            Event submitted. An admin will review it before it appears here —
            that is what keeps duplicates and spam off the list.
          </p>
        </div>
      ) : null}

      {/* search and filters */}
      <form
        action="/events"
        method="get"
        className="mb-5 flex flex-wrap gap-2 rounded-card border border-line bg-surface p-3"
      >
        <input type="hidden" name="when" value={query.when} />

        <div className="relative min-w-56 flex-1">
          <label htmlFor="event-q" className="sr-only">
            Search events
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="event-q"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Search by name, organiser, theme or city"
            className="field pl-9"
          />
        </div>

        <label htmlFor="event-mode" className="sr-only">
          Mode
        </label>
        <select
          id="event-mode"
          name="mode"
          defaultValue={query.mode ?? ""}
          className="field w-auto"
        >
          <option value="">Any mode</option>
          {EVENT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {EVENT_MODE_LABEL[mode as EventMode]}
            </option>
          ))}
        </select>

        <button type="submit" className={btn("primary", "md")}>
          Search
        </button>
        {query.q || query.mode ? (
          <Link href="/events" className={btn("ghost", "md")}>
            Clear
          </Link>
        ) : null}
      </form>

      <TabLinks
        className="mb-5"
        tabs={[
          {
            href: withParams("/events", raw, { when: "upcoming", page: null }),
            label: "Upcoming",
            active: query.when === "upcoming",
          },
          {
            href: withParams("/events", raw, { when: "past", page: null }),
            label: "Past",
            active: query.when === "past",
          },
          {
            href: withParams("/events", raw, { when: "all", page: null }),
            label: "All",
            active: query.when === "all",
          },
        ]}
      />

      {listing.events.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="size-5" />}
          title="No events match that"
          description="Try a different search, or list the event yourself — anyone can submit one and an admin reviews it before it goes public."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/events" className={btn("outline", "md")}>
                Clear filters
              </Link>
              <Link
                href={user ? "/events/new" : "/login?next=/events/new"}
                className={btn("primary", "md")}
              >
                List an event
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <p className={cn("mb-4 text-[0.85rem] text-ink-muted")}>
            {listing.total} {listing.total === 1 ? "event" : "events"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listing.events.map((event) => (
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

          <Pagination
            page={listing.page}
            totalPages={listing.totalPages}
            makeHref={(page) => withParams("/events", raw, { page })}
          />
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CalendarIcon,
  GlobeIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/icons";
import { EVENT_MODE_LABEL, type EventMode } from "@/lib/enums";
import { countdown, formatDateRange, parseThemes } from "@/lib/utils";

export function ModeBadge({ mode }: { mode: string }) {
  const key = (mode as EventMode) ?? "ONLINE";
  return (
    <Badge tone="neutral">
      {key === "ONLINE" ? (
        <GlobeIcon className="size-3" />
      ) : (
        <MapPinIcon className="size-3" />
      )}
      {EVENT_MODE_LABEL[key] ?? mode}
    </Badge>
  );
}

export type EventCardEvent = {
  id: string;
  name: string;
  slug: string;
  organizer: string;
  startDate: Date | string;
  endDate: Date | string;
  registrationDeadline: Date | string | null;
  mode: string;
  location: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  themes: string;
  prize: string | null;
  lookingCount?: number;
  teamCount?: number;
};

export function EventCard({ event }: { event: EventCardEvent }) {
  const themes = parseThemes(event.themes);

  return (
    <Card interactive className="flex h-full flex-col">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/events/${event.slug}`}
              className="block text-[0.98rem] font-semibold leading-snug hover:text-brand"
            >
              {event.name}
            </Link>
            <p className="mt-0.5 truncate text-[0.78rem] text-ink-muted">
              {event.organizer}
            </p>
          </div>
          <ModeBadge mode={event.mode} />
        </div>

        <dl className="mt-3 space-y-1.5 text-[0.8rem] text-ink-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-3.5 shrink-0 text-ink-muted" />
            <dd>{formatDateRange(event.startDate, event.endDate)}</dd>
          </div>
          {event.location ? (
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-3.5 shrink-0 text-ink-muted" />
              <dd className="truncate">{event.location}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <UsersIcon className="size-3.5 shrink-0 text-ink-muted" />
            <dd>
              Teams of {event.minTeamSize}-{event.maxTeamSize}
            </dd>
          </div>
        </dl>

        {themes.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {themes.slice(0, 3).map((theme) => (
              <span
                key={theme}
                className="rounded-box bg-surface-2 px-1.5 py-0.5 text-[0.72rem] text-ink-muted"
              >
                {theme}
              </span>
            ))}
            {themes.length > 3 ? (
              <span className="px-1 text-[0.72rem] text-ink-muted">
                +{themes.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.78rem]">
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-ink-muted">
            {event.lookingCount !== undefined ? (
              <span>
                <strong className="font-semibold text-ink">
                  {event.lookingCount}
                </strong>{" "}
                looking
              </span>
            ) : null}
            {event.teamCount !== undefined ? (
              <span>
                <strong className="font-semibold text-ink">{event.teamCount}</strong>{" "}
                {event.teamCount === 1 ? "team" : "teams"}
              </span>
            ) : null}
          </span>

          {event.registrationDeadline ? (
            <Badge
              tone={
                new Date(event.registrationDeadline).getTime() < Date.now()
                  ? "neutral"
                  : "warn"
              }
              title={`Registration deadline: ${new Date(event.registrationDeadline).toDateString()}`}
            >
              {countdown(event.registrationDeadline)}
            </Badge>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

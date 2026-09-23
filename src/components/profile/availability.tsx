import { Badge, Dot, type BadgeTone } from "@/components/ui/badge";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/enums";

const tone: Record<Availability, BadgeTone> = {
  OPEN: "ok",
  EVENTS_ONLY: "warn",
  NOT_AVAILABLE: "neutral",
};

const shortLabel: Record<Availability, string> = {
  OPEN: "Open to teams",
  EVENTS_ONLY: "Events only",
  NOT_AVAILABLE: "Not available",
};

/** Green / amber / grey, exactly as the design guidelines call for. */
export function AvailabilityBadge({
  availability,
  short = false,
}: {
  availability: string;
  short?: boolean;
}) {
  const key = (availability as Availability) ?? "OPEN";
  return (
    <Badge tone={tone[key] ?? "neutral"} title={AVAILABILITY_LABEL[key]}>
      <Dot />
      {short ? shortLabel[key] : AVAILABILITY_LABEL[key]}
    </Badge>
  );
}

export function ParticipationBadge({ status }: { status: string }) {
  if (status === "LOOKING_FOR_TEAM") {
    return (
      <Badge tone="brand">
        <Dot />
        Looking for a team
      </Badge>
    );
  }
  if (status === "TEAM_LOOKING_FOR_MEMBERS") {
    return (
      <Badge tone="sky">
        <Dot />
        Team needs members
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <Dot />
      In a team
    </Badge>
  );
}

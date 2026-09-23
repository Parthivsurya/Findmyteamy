import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClockIcon, ExternalIcon, TrophyIcon, VerifiedIcon } from "@/components/icons";
import {
  ACHIEVEMENT_POSITION_LABEL,
  ACHIEVEMENT_STATUS_LABEL,
  type AchievementPosition,
  type AchievementStatus,
} from "@/lib/enums";
import { formatDate } from "@/lib/utils";

const statusTone: Record<AchievementStatus, BadgeTone> = {
  VERIFIED: "ok",
  PENDING: "warn",
  UNVERIFIED: "neutral",
  REJECTED: "danger",
};

export function AchievementStatusBadge({ status }: { status: string }) {
  const key = (status as AchievementStatus) ?? "UNVERIFIED";
  return (
    <Badge tone={statusTone[key] ?? "neutral"}>
      {key === "VERIFIED" ? <VerifiedIcon className="size-3" /> : null}
      {key === "PENDING" ? <ClockIcon className="size-3" /> : null}
      {ACHIEVEMENT_STATUS_LABEL[key] ?? status}
    </Badge>
  );
}

export type AchievementView = {
  id: string;
  title: string;
  eventName: string;
  organizer: string | null;
  position: string;
  date: Date | string;
  description: string | null;
  proofUrl: string | null;
  status: string;
  reviewNote?: string | null;
};

export function AchievementCard({
  achievement,
  showStatus = true,
  action,
}: {
  achievement: AchievementView;
  showStatus?: boolean;
  action?: React.ReactNode;
}) {
  const isWin = achievement.position === "WINNER";

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div
          aria-hidden
          className={
            isWin
              ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime text-[#4a5010]"
              : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
          }
        >
          <TrophyIcon className="size-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-[0.9rem] font-semibold leading-snug">
              {achievement.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {showStatus ? (
                <AchievementStatusBadge status={achievement.status} />
              ) : null}
              {action}
            </div>
          </div>

          <p className="mt-1 text-[0.8rem] text-ink-muted">
            <span className="font-medium text-ink-2">
              {ACHIEVEMENT_POSITION_LABEL[
                achievement.position as AchievementPosition
              ] ?? achievement.position}
            </span>
            {" · "}
            {achievement.eventName}
            {achievement.organizer ? ` · ${achievement.organizer}` : ""}
            {" · "}
            {formatDate(achievement.date)}
          </p>

          {achievement.description ? (
            <p className="mt-2 text-[0.83rem] leading-relaxed text-ink-2">
              {achievement.description}
            </p>
          ) : null}

          {achievement.status === "REJECTED" && achievement.reviewNote ? (
            <p className="mt-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-[0.78rem] text-danger">
              Reviewer note: {achievement.reviewNote}
            </p>
          ) : null}

          {achievement.proofUrl ? (
            <a
              href={achievement.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[0.78rem] font-medium text-brand hover:underline"
            >
              View proof
              <ExternalIcon className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

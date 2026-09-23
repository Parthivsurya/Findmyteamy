import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/matching";

/** Horizontal progress bar — profile completeness, filled slots, admin stats. */
export function Meter({
  value,
  max = 100,
  className,
  tone = "brand",
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "ok" | "sky";
  label?: string;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const fill =
    tone === "ok" ? "bg-ok" : tone === "sky" ? "bg-sky" : "brand-gradient";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * The match score shown on every candidate card. Strong matches get the lime
 * accent so they stand out while scanning a long list.
 */
export function ScoreBadge({
  score,
  className,
  showLabel = true,
}: {
  score: number;
  className?: string;
  showLabel?: boolean;
}) {
  const band = scoreBand(score);
  const tone =
    band === "strong"
      ? "bg-lime text-[#4a5010] dark:text-[#2b3006]"
      : band === "good"
        ? "bg-brand-soft text-brand"
        : "bg-surface-2 text-ink-muted";

  return (
    <span
      title={`Match score ${score} out of 100`}
      className={cn(
        "inline-flex items-baseline gap-1 rounded-full px-2.5 py-1",
        "text-[0.78rem] font-bold tabular-nums leading-none",
        tone,
        className,
      )}
    >
      {score}
      {showLabel ? (
        <span className="text-[0.65rem] font-semibold opacity-75">match</span>
      ) : null}
    </span>
  );
}

/** Ring version used on the Team Builder slot headers. */
export function SlotProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.78rem] text-ink-muted">
      <span className="font-semibold tabular-nums text-ink">
        {filled}/{total}
      </span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-4 rounded-full",
              i < filled ? "bg-ok" : "bg-surface-3",
            )}
          />
        ))}
      </span>
    </span>
  );
}

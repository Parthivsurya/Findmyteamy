import { cn } from "@/lib/utils";

/** Plain progress bar. */
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
  tone?: "brand" | "ok";
  label?: string;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const fill = tone === "ok" ? "bg-ok" : "bg-brand-fill";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-box bg-surface-3", className)}
    >
      <div className={cn("h-full", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** The match score, as plain text. */
export function ScoreBadge({
  score,
  className,
  showLabel = true,
}: {
  score: number;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span
      title={`Match score ${score} out of 100`}
      className={cn(
        "shrink-0 text-[0.78rem] font-semibold tabular-nums text-ink-2",
        className,
      )}
    >
      {score}
      {showLabel ? (
        <span className="font-normal text-ink-muted"> match</span>
      ) : null}
    </span>
  );
}

export function SlotProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  return (
    <span className="text-[0.78rem] text-ink-muted">
      <span className="font-semibold tabular-nums text-ink">
        {filled}/{total}
      </span>{" "}
      filled
    </span>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty states matter more than usual here: a brand-new platform genuinely has
 * empty searches, so each one names a concrete next step.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card",
        "border border-dashed border-line-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" className="size-5">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="text-[0.95rem] font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-md text-[0.85rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}

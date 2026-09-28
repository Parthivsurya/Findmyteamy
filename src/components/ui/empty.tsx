import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Plain empty state: a line of explanation and the next step. */
export function EmptyState({
  title,
  description,
  action,
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
        "rounded-box border border-line bg-surface px-4 py-10 text-center",
        className,
      )}
    >
      <h3 className="text-[0.95rem] font-semibold">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-[0.85rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-box bg-surface-2", className)} />;
}

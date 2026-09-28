import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A plain bordered box. */
export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-box border border-line bg-surface",
        interactive &&
          "transition-colors duration-120 hover:border-line-strong hover:bg-surface-2/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[0.92rem] font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[0.8rem] text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-end justify-between gap-3", className)}>
      <h2 className="text-[1rem] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Server-rendered tab strip — each tab is a real link, so tabs are bookmarkable. */
export function TabLinks({
  tabs,
  className,
}: {
  tabs: Array<{ href: string; label: ReactNode; active: boolean; count?: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-slim flex gap-1 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[0.85rem] font-medium transition-colors",
            tab.active
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums",
                tab.active ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-muted",
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/** Pagination that preserves every existing filter in the query string. */
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowed = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-1.5"
    >
      <PageLink href={makeHref(page - 1)} disabled={page <= 1}>
        Previous
      </PageLink>
      {windowed.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <PageLink key={p} href={makeHref(p)} current={p === page}>
            {p}
          </PageLink>
        ),
      )}
      <PageLink href={makeHref(page + 1)} disabled={page >= totalPages}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  disabled,
  current,
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  current?: boolean;
}) {
  const classes = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3",
    "text-[0.82rem] font-medium transition-colors",
    current
      ? "border-brand bg-brand text-white"
      : "border-line bg-surface text-ink-2 hover:border-brand hover:text-brand",
    disabled && "pointer-events-none opacity-45",
  );

  if (disabled) return <span className={classes}>{children}</span>;
  return (
    <Link href={href} className={classes} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

function pageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push(null);
    out.push(p);
    previous = p;
  }
  return out;
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "sky"
  | "lime"
  | "ok"
  | "warn"
  | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  brand: "bg-brand-soft text-brand border-line",
  sky: "bg-sky-soft text-sky-ink border-line",
  lime: "bg-lime-soft text-lime-ink border-line",
  ok: "bg-ok-soft text-ok border-line",
  warn: "bg-warn-soft text-warn border-line",
  danger: "bg-danger-soft text-danger border-line",
};

/** A small plain label. */
export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5",
        "text-[0.72rem] font-medium leading-4",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 rounded-full bg-current", className)}
    />
  );
}

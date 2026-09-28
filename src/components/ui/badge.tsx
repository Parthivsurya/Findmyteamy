import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * `sky` and `lime` are gone. A badge's tone has to mean something: neutral is
 * a fact, brand is the thing you are looking at, and ok / warn / danger are
 * real state. A fourth and fifth decorative colour meant a profile could show
 * five tones at once and none of them carried information.
 */
export type BadgeTone = "neutral" | "brand" | "ok" | "warn" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  brand: "bg-brand-soft text-brand border-line",
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
        "inline-flex items-center gap-1 rounded-box border px-1.5 py-0.5",
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

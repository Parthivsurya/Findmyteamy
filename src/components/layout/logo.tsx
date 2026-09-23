import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark. The mark is two overlapping person shapes — two people becoming a
 * team — drawn in the palette gradient.
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label="FindMyTeammate — home"
    >
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] brand-gradient shadow-card transition-transform duration-200 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <circle cx="9" cy="8.5" r="3" fill="white" fillOpacity="0.95" />
          <path
            d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
            stroke="white"
            strokeOpacity="0.95"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="16.5" cy="10" r="2.4" fill="#F2F7A0" />
          <path
            d="M12.8 19c0-2.4 1.9-4 4-4s3.7 1.6 3.7 4"
            stroke="#F2F7A0"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {showText ? (
        <span className="text-[0.98rem] font-bold tracking-[-0.02em]">
          FindMy<span className="text-brand">Teammate</span>
        </span>
      ) : null}
    </Link>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Plain text wordmark. */
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
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="FindMyTeammate home"
    >
      {showText ? (
        <span className="text-[0.95rem] font-medium tracking-[-0.02em]">
          FindMy<span className="text-brand">Teammate</span>
        </span>
      ) : null}
    </Link>
  );
}

import Link from "next/link";
import { btn } from "@/components/ui/button";

/**
 * Shown for an unknown route and wherever `notFound()` is called, which is
 * mostly a profile or event slug that no longer exists.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <h1 className="text-[1.5rem] leading-[1.15]">Page not found</h1>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
        That link does not point anywhere. A profile or an event may have been
        removed since it was shared.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className={btn("primary")}>
          Search for a teammate
        </Link>
        <Link href="/events" className={btn("outline")}>
          Browse events
        </Link>
      </div>
    </div>
  );
}

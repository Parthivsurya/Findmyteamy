"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the whole app. Without one, a thrown error showed Next's
 * own error screen, which is a different typeface on a different background
 * and reads as the site having fallen over rather than one page failing.
 *
 * The prop is `retry` in Next 16, not `reset` as in earlier versions.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // No error service is wired up, so the server log is the record.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <h1 className="text-[1.5rem] leading-[1.15]">Something went wrong</h1>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
        This page failed to load. Trying again usually works, because most
        failures here are a lost database connection rather than a broken page.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <a href="/" className="inline-flex">
          <Button type="button" variant="outline" tabIndex={-1}>
            Go to search
          </Button>
        </a>
      </div>

      {error.digest ? (
        <p className="rule mt-8 pt-4 text-[0.78rem] text-ink-muted">
          If you report this, quote{" "}
          <code className="font-mono text-ink-2">{error.digest}</code>.
        </p>
      ) : null}
    </div>
  );
}

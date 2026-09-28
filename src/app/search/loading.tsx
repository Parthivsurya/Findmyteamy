import { Skeleton } from "@/components/ui/empty";

/**
 * Search is the slowest page in the app, because it ranks every candidate
 * against the filters. The skeleton mirrors the real result rows so the layout
 * does not jump when they arrive, which a spinner cannot do.
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <Skeleton className="hidden h-80 lg:block" />

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, row) => (
            <div
              key={row}
              className="flex items-start gap-3 rounded-box border border-line bg-surface p-4"
            >
              <Skeleton className="size-10 shrink-0 rounded-round" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

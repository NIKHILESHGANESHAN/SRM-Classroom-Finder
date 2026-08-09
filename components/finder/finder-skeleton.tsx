/**
 * Shimmer skeletons for the Finder list (used by loading.tsx + optional client
 * pending states). Pure CSS pulse — no spinner.
 */
export function FinderSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="mt-4 flex justify-between gap-3">
            <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

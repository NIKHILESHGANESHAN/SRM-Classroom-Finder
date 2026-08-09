/**
 * Shimmer skeletons for the Finder list (used by loading.tsx + optional client
 * pending states). CSS shimmer sweep — not a spinner.
 */
function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-muted ${className ?? ""}`}
    >
      <div
        className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none"
        aria-hidden
      />
    </div>
  );
}

export function FinderSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading free rooms">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <ShimmerBlock className="h-7 w-20" />
              <ShimmerBlock className="h-4 w-48 max-w-full" />
              <ShimmerBlock className="h-3 w-36 max-w-full" />
            </div>
            <ShimmerBlock className="h-8 w-24 shrink-0" />
          </div>
          <div className="mt-4 flex justify-between gap-3">
            <ShimmerBlock className="h-8 w-44 max-w-[60%]" />
            <ShimmerBlock className="h-11 w-24 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

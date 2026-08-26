/**
 * Finder list skeleton — matches solid classroom card hierarchy.
 */
function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className ?? ""}`}
      aria-hidden
    />
  );
}

export function FinderSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading free rooms">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-surface border border-border/60 bg-card px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-28" />
              <SkeletonLine className="h-9 w-24" />
            </div>
            <SkeletonLine className="h-10 w-32 shrink-0" />
          </div>
          <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-4 w-28" />
          </div>
          <div className="mt-4 flex gap-2">
            <SkeletonLine className="h-11 flex-1" />
            <SkeletonLine className="h-11 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

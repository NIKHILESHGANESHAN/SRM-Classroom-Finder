import { FinderSkeleton } from "@/components/finder/finder-skeleton";
import { GlassNavigation } from "@/components/glass";

export default function FinderLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-4 sm:max-w-2xl sm:gap-5 sm:py-6">
      <GlassNavigation
        aria-hidden
        className="flex h-12 items-center gap-2 px-3 motion-reduce:animate-none"
      >
        <div className="h-9 w-9 animate-pulse rounded-button bg-muted/70 motion-reduce:animate-none" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-36 animate-pulse rounded bg-muted/70 motion-reduce:animate-none" />
        </div>
      </GlassNavigation>
      <div className="h-28 animate-pulse rounded-popover bg-muted/50 motion-reduce:animate-none" />
      <div className="h-11 animate-pulse rounded-control bg-muted/60 motion-reduce:animate-none" />
      <FinderSkeleton count={3} />
    </main>
  );
}

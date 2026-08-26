import { GlassNavigation } from "@/components/glass";

export default function ContributeLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-4 sm:max-w-lg sm:gap-5 sm:py-6">
      <GlassNavigation aria-hidden className="h-12 animate-pulse bg-muted/50 motion-reduce:animate-none" />
      <div className="space-y-2 px-1">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted/70 motion-reduce:animate-none" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="min-h-[280px] animate-pulse rounded-surface border border-border/60 bg-muted/40 motion-reduce:animate-none" />
    </main>
  );
}

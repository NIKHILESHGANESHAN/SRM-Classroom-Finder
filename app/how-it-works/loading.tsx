import { GlassNavigation } from "@/components/glass";

export default function HowItWorksLoading() {
  return (
    <main className="relative min-h-screen px-4 py-4 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-2xl sm:gap-8">
        <GlassNavigation
          aria-hidden
          className="flex h-12 items-center gap-2 px-3 motion-reduce:animate-none"
        >
          <div className="h-9 w-9 rounded-button bg-muted/70 motion-reduce:animate-none" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-28 rounded bg-muted/70 motion-reduce:animate-none" />
          </div>
        </GlassNavigation>
        <div className="space-y-2 px-1">
          <div className="h-7 w-56 rounded-surface bg-muted motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-md rounded bg-muted/70 motion-reduce:animate-none" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 rounded bg-muted motion-reduce:animate-none" />
              <div className="h-16 rounded bg-muted/50 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

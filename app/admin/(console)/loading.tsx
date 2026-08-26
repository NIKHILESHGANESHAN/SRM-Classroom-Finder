import { GlassNavigation } from "@/components/glass";

export default function AdminConsoleLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-7">
      <GlassNavigation
        aria-hidden
        className="flex h-14 items-center gap-2 px-3 motion-reduce:animate-none"
      >
        <div className="h-9 w-9 rounded-button bg-muted/70 motion-reduce:animate-none" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-40 rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-56 rounded bg-muted/70 motion-reduce:animate-none" />
        </div>
      </GlassNavigation>
      <div className="space-y-2 px-1">
        <div className="h-7 w-36 rounded-md bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-md rounded bg-muted/70 motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-surface border border-border/60 bg-muted/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-48 rounded-surface border border-border/60 bg-muted/35 motion-reduce:animate-none" />
    </div>
  );
}

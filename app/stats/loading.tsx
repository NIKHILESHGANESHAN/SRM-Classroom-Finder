export default function StatsLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-28 animate-pulse rounded-xl bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted/50" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
    </main>
  );
}

export default function ContributeLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-1.5 flex-1 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="min-h-[320px] animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
    </main>
  );
}

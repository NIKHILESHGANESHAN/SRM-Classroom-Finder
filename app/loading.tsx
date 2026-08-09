/**
 * Root loading UI — shown while the landing page (or nested segments without
 * their own loading.tsx) stream in.
 */
export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-48 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid w-full max-w-md gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-muted/60" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted/60" />
      </div>
    </main>
  );
}

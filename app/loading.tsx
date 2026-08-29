/**
 * Root loading UI — landing page skeleton while the route streams in.
 */
export default function RootLoading() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto h-11 max-w-xl animate-pulse rounded-popover bg-muted/60 motion-reduce:animate-none" />
      </div>
      <main className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-xl flex-col justify-center gap-10 px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
        <div className="space-y-4">
          <div className="h-10 w-4/5 max-w-sm animate-pulse rounded-surface bg-muted motion-reduce:animate-none" />
          <div className="h-5 w-full max-w-md animate-pulse rounded bg-muted/70 motion-reduce:animate-none" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted/50 motion-reduce:animate-none" />
        </div>
        <div className="space-y-5">
          <div className="h-12 w-full animate-pulse rounded-button bg-muted motion-reduce:animate-none sm:w-60" />
          <div className="space-y-2 border-l-2 border-border pl-4">
            <div className="h-4 w-36 animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
          </div>
        </div>
      </main>
    </div>
  );
}

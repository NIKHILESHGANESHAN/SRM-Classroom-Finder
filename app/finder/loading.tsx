import { FinderSkeleton } from "@/components/finder/finder-skeleton";

export default function FinderLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="h-10 w-52 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted/60" />
      <FinderSkeleton count={4} />
    </main>
  );
}

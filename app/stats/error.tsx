"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function StatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[stats]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-title text-foreground">Stats couldn&apos;t load</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Try again in a moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" className="btn-press min-h-11" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" className="btn-press min-h-11" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}

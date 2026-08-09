"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ContributeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[contribute]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-primary">Couldn’t load Contributor</h1>
      <p className="text-sm text-muted-foreground">
        Check that the database is running and seeded, then try again.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset} className="min-h-11">
          Try again
        </Button>
        <Button variant="outline" className="min-h-11" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}

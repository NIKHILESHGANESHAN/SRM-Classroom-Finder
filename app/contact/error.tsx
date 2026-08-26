"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ContactError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[contact]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-title text-foreground">Couldn&apos;t load this page</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Try again in a moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" className="btn-press min-h-11" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" className="btn-press min-h-11" asChild>
          <Link href="/contact">Back to Contact</Link>
        </Button>
      </div>
    </div>
  );
}

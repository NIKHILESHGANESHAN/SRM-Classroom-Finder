"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";

/**
 * Root route error boundary — catches uncaught errors in the App Router tree
 * below the root layout (per-route boundaries still take precedence).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { play } = useSound();

  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
        Something went wrong
      </p>
      <h1 className="text-2xl font-bold text-primary">Couldn’t load this page</h1>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred. You can try again or head back home.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => {
            play("click");
            reset();
          }}
        >
          Try again
        </Button>
        <Button variant="outline" className="min-h-11" asChild>
          <SoundLink href="/">Back home</SoundLink>
        </Button>
      </div>
    </main>
  );
}

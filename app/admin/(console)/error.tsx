"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";

export default function AdminConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { play } = useSound();

  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-title text-foreground">Couldn&apos;t load this page</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Try again in a moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          className="btn-press min-h-11"
          onClick={() => {
            play("click");
            reset();
          }}
        >
          Try again
        </Button>
        <Button variant="outline" className="btn-press min-h-11" asChild>
          <SoundLink href="/admin">Back to Overview</SoundLink>
        </Button>
      </div>
    </div>
  );
}

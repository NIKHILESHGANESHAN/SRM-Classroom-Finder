"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";
import { PRODUCT_NAME } from "@/lib/design-tokens";

export default function FinderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { play } = useSound();

  useEffect(() => {
    console.error("[finder]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        Couldn&apos;t load {PRODUCT_NAME}
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong loading free rooms. Try again in a moment.
      </p>
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

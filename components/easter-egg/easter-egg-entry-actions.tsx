"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSound } from "@/components/sound/sound-provider";
import { openXoEasterEgg } from "@/lib/open-xo-easter-egg";

/**
 * Evening/night Easter Egg actions — launch XO or return to the landing page.
 * Not used for the morning Easter Egg (Finder morning note).
 */
export function EasterEggEntryActions() {
  const router = useRouter();
  const { play } = useSound();

  function handlePlayXo() {
    play("click");
    openXoEasterEgg();
  }

  function handleHome() {
    play("click");
    router.push("/");
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button
        type="button"
        className="min-h-11 w-full"
        onClick={handlePlayXo}
      >
        Play XO
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11"
        onClick={handleHome}
        aria-label="Go home"
        title="Go home"
      >
        <Home className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  );
}

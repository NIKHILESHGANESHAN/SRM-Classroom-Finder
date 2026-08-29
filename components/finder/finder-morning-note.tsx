"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GlassSurface } from "@/components/glass";
import { Button } from "@/components/ui/button";
import { useSound } from "@/components/sound/sound-provider";
import { isMorningEasterEgg } from "@/lib/easter-egg";
import {
  morningNoteDismissStorageKey,
} from "@/lib/finder-ui";
import { getCampusDateString } from "@/lib/slots";

type FinderMorningNoteProps = {
  totalActiveReports: number;
  show: boolean;
};

/**
 * Morning Easter Egg — 04:00–07:50 IST with zero active reports.
 * Non-blocking, dismissible for the campus day (sessionStorage).
 */
export function FinderMorningNote({
  totalActiveReports,
  show,
}: FinderMorningNoteProps) {
  const { play } = useSound();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!show) {
      setDismissed(false);
      return;
    }
    const key = morningNoteDismissStorageKey(getCampusDateString());
    setDismissed(sessionStorage.getItem(key) === "1");
  }, [show]);

  if (
    !show ||
    dismissed ||
    totalActiveReports > 0 ||
    !isMorningEasterEgg()
  ) {
    return null;
  }

  function dismiss() {
    play("close");
    const key = morningNoteDismissStorageKey(getCampusDateString());
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  }

  return (
    <GlassSurface
      variant="clear"
      className="flex items-start gap-3 px-3 py-3 sm:px-4"
      role="status"
    >
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        <p className="font-medium">Good morning.</p>
        <p className="mt-0.5 text-muted-foreground">
          Campus is still waking up — no one&apos;s reported a room yet. Check
          again in a moment.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11 shrink-0"
        onClick={dismiss}
        aria-label="Dismiss morning note"
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </GlassSurface>
  );
}

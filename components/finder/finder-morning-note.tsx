"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GlassSurface } from "@/components/glass";
import { Button } from "@/components/ui/button";
import {
  isBeforeFirstReportablePeriod,
  morningNoteDismissStorageKey,
} from "@/lib/finder-ui";
import { getCampusDateString } from "@/lib/slots";
import type { FinderSlot } from "@/lib/finder-data";

type FinderMorningNoteProps = {
  timeSlots: FinderSlot[];
  totalActiveReports: number;
  show: boolean;
};

/**
 * Early-morning note — only before the first reportable period with zero active reports.
 * Non-blocking, dismissible for the campus day (sessionStorage).
 */
export function FinderMorningNote({
  timeSlots,
  totalActiveReports,
  show,
}: FinderMorningNoteProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!show) return;
    const key = morningNoteDismissStorageKey(getCampusDateString());
    setDismissed(sessionStorage.getItem(key) === "1");
  }, [show]);

  if (
    !show ||
    dismissed ||
    totalActiveReports > 0 ||
    !isBeforeFirstReportablePeriod(timeSlots)
  ) {
    return null;
  }

  function dismiss() {
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

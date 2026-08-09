"use client";

import { DoorOpen } from "lucide-react";

/** Friendly empty state when no free rooms match filters / current slot. */
export function FinderEmptyState({ slotLabel }: { slotLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <DoorOpen className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        No free rooms right now
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Nothing showing for {slotLabel}. Check back next period — or switch
        filters / be the first to report via Contributor.
      </p>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DoorOpen } from "lucide-react";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";

/** Friendly empty state when no free rooms match filters / current slot. */
export function FinderEmptyState({ slotLabel }: { slotLabel: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_UI, ease: EASE_OUT_EXPO }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center dark:bg-muted/20"
    >
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-transparent blur-sm"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm dark:bg-primary/20">
          <DoorOpen className="h-8 w-8" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        No free rooms right now
      </h2>
      <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
        Nothing showing for {slotLabel}. Check back next period — or switch
        filters / be the first to report via Contributor.
      </p>
    </motion.div>
  );
}

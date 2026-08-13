"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ClipboardList, DoorOpen, MapPinOff } from "lucide-react";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";
import type { FinderCoverageKind } from "@/lib/finder-data";

type FinderEmptyStateProps = {
  slotLabel: string;
  coverageKind?: FinderCoverageKind;
  searchMiss?: boolean;
};

function copyFor(kind: FinderCoverageKind, slotLabel: string): {
  title: string;
  body: string;
} {
  if (kind === "inventory_gap") {
    return {
      title: "We don't have classroom listings here yet",
      body: `No verified rooms are on file for ${slotLabel}. That does not mean every room is occupied — inventory for this area is still being added.`,
    };
  }
  if (kind === "insufficient_reports") {
    return {
      title: "We don't have enough reports for this floor yet",
      body: `Classrooms exist, but nobody has reported a free room for ${slotLabel}. Check back later, or be the first via Contributor.`,
    };
  }
  return {
    title: "No rooms are currently reported free",
    body: `Nothing showing for ${slotLabel}. Rooms may be in class, or earlier reports may have expired — try another filter or report a room you find empty.`,
  };
}

/** Honest empty state: inventory gap ≠ all occupied ≠ none free right now. */
export function FinderEmptyState({
  slotLabel,
  coverageKind = "none_free",
  searchMiss = false,
}: FinderEmptyStateProps) {
  const reduceMotion = useReducedMotion();

  const { title, body, Icon } = searchMiss
    ? {
        title: "No matching rooms",
        body: `Nothing showing for ${slotLabel}. Try a different room number or clear the search.`,
        Icon: DoorOpen,
      }
    : {
        ...copyFor(coverageKind, slotLabel),
        Icon:
          coverageKind === "inventory_gap"
            ? MapPinOff
            : coverageKind === "insufficient_reports"
              ? ClipboardList
              : DoorOpen,
      };

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
          <Icon className="h-8 w-8" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
        {body}
      </p>
    </motion.div>
  );
}

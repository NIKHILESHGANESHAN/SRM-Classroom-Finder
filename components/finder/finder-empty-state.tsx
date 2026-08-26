"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MOTION_STANDARD, EASE_OUT_EXPO } from "@/lib/motion";
import type { FinderEmptyReason } from "@/lib/finder-realtime";

type FinderEmptyStateProps = {
  slotLabel: string;
  reason?: FinderEmptyReason;
};

function copyFor(
  reason: FinderEmptyReason,
  slotLabel: string,
): { title: string; body: string } {
  if (reason === "inventory_gap") {
    return {
      title: "No rooms listed here yet",
      body: `We don't have classroom inventory for ${slotLabel}. That doesn't mean every room is taken — listings for this area may still be added.`,
    };
  }
  if (reason === "insufficient_reports") {
    return {
      title: "Not enough reports for this floor",
      body: `Rooms exist, but nobody has reported one free for ${slotLabel}. Try another filter, or report a room you find empty.`,
    };
  }
  if (reason === "search_miss") {
    return {
      title: "No matching rooms",
      body: `Nothing showing for ${slotLabel}. Try a different room number or clear the search.`,
    };
  }
  if (reason === "no_recent") {
    return {
      title: "Nothing recent",
      body: "No reports or confirmations in the last 10 minutes. Other rooms may still be free — try All, or check again shortly.",
    };
  }
  if (reason === "no_ending") {
    return {
      title: "Nothing ending soon",
      body: "No rooms expire in the next 10 minutes. Try All to see everything that's free.",
    };
  }
  if (reason === "my_buildings") {
    return {
      title: "Nothing in My buildings",
      body: "Star a building to use this filter. Other buildings are still available under All.",
    };
  }
  return {
    title: "Nothing free right now",
    body: `No active reports for ${slotLabel}. Rooms may be in class, or earlier reports may have expired. Check again in a moment, or report a room you find empty.`,
  };
}

/** Honest empty state — inventory gap ≠ all occupied ≠ none free globally. */
export function FinderEmptyState({
  slotLabel,
  reason = "none_free",
}: FinderEmptyStateProps) {
  const reduceMotion = useReducedMotion();
  const { title, body } = copyFor(reason, slotLabel);

  return (
    <motion.div
      role="status"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
      className="rounded-surface border border-dashed border-border bg-muted/30 px-5 py-10 text-left sm:py-12"
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </motion.div>
  );
}

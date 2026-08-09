"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  status: "unverified" | "confirmed" | string;
  confirmationCount: number;
};

/**
 * 🟡 Unverified / 🟢 Confirmed — flips with a quick scale pop when status is confirmed.
 */
export function ConfidenceBadge({ status, confirmationCount }: ConfidenceBadgeProps) {
  const reduceMotion = useReducedMotion();
  const confirmed = status === "confirmed" || confirmationCount >= 2;

  return (
    <motion.span
      key={confirmed ? "confirmed" : "unverified"}
      initial={reduceMotion ? false : { scale: 0.85, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 22 }
      }
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold",
        confirmed
          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
          : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
      )}
    >
      <span aria-hidden>{confirmed ? "🟢" : "🟡"}</span>
      {confirmed ? "Confirmed" : "Unverified"}
    </motion.span>
  );
}

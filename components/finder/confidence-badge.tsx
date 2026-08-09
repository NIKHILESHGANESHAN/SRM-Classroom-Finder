"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isConfirmedBadgeStatus } from "@/lib/token-trust";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  status: "unverified" | "confirmed" | "hidden" | "expired" | string;
  /** Kept for display/debug; Confirmed is driven by status only (Phase 9). */
  confirmationCount: number;
};

/**
 * 🟡 Unverified / 🟢 Confirmed.
 * Status is authoritative — soft-throttled rooms can have confirmation_count ≥ 2
 * while still unverified. Hidden / expired never show Confirmed.
 * Spring flip on status change; opacity-only when prefers-reduced-motion.
 */
export function ConfidenceBadge({
  status,
  confirmationCount,
}: ConfidenceBadgeProps) {
  const reduceMotion = useReducedMotion();
  const confirmed = isConfirmedBadgeStatus(status);
  void confirmationCount;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={confirmed ? "confirmed" : "unverified"}
        initial={
          reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0 }
        }
        animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        exit={
          reduceMotion
            ? { opacity: 0 }
            : { scale: 0.9, opacity: 0, transition: { duration: 0.12 } }
        }
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : { type: "spring", stiffness: 420, damping: 22 }
        }
        className={cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold",
          confirmed
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
            : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
        )}
        title={
          confirmed
            ? "Confirmed by classmates"
            : "Unverified — needs more confirmations"
        }
      >
        <span aria-hidden>{confirmed ? "🟢" : "🟡"}</span>
        {confirmed ? "Confirmed" : "Unverified"}
      </motion.span>
    </AnimatePresence>
  );
}

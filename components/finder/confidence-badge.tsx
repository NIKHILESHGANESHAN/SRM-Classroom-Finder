"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, HelpCircle, ShieldCheck, ShieldQuestion } from "lucide-react";
import { SPRING_BADGE } from "@/lib/motion";
import { deriveConfidence } from "@/lib/report-display";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  status: "unverified" | "confirmed" | "hidden" | "expired" | string;
  confirmationCount: number;
  occupiedStrikeCount?: number;
};

/**
 * Unverified / Confirmed remain status-driven (never Confirmed for hidden/expired).
 * Richer level + counts are derived; color is not the only cue.
 */
export function ConfidenceBadge({
  status,
  confirmationCount,
  occupiedStrikeCount = 0,
}: ConfidenceBadgeProps) {
  const reduceMotion = useReducedMotion();
  const display = deriveConfidence({
    status,
    confirmationCount,
    occupiedStrikeCount,
  });

  if (!display) {
    return (
      <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
        Unavailable
      </span>
    );
  }

  const confirmed = display.badge === "confirmed";
  const Icon = confirmed
    ? display.level === "high"
      ? ShieldCheck
      : BadgeCheck
    : display.level === "low"
      ? HelpCircle
      : ShieldQuestion;

  const levelText =
    display.level === "high"
      ? "High confidence"
      : display.level === "moderate"
        ? "Moderate confidence"
        : "Low confidence";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${display.badge}-${display.level}`}
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.85, rotateY: -70 }
        }
        animate={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, scale: 1, rotateY: 0 }
        }
        exit={
          reduceMotion
            ? { opacity: 0 }
            : {
                opacity: 0,
                scale: 0.9,
                rotateY: 50,
                transition: { duration: 0.12 },
              }
        }
        transition={reduceMotion ? { duration: 0.15 } : SPRING_BADGE}
        style={{ perspective: 600 }}
        className={cn(
          "inline-flex max-w-[14rem] flex-col items-end gap-0.5 rounded-lg px-2.5 py-1 text-right",
          confirmed
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
            : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
        )}
        aria-label={display.ariaLabel}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {confirmed ? "Confirmed" : "Unverified"}
        </span>
        <span className="text-[11px] font-medium leading-tight opacity-90">
          {levelText}
          <span className="font-normal"> · {display.summary}</span>
        </span>
      </motion.span>
    </AnimatePresence>
  );
}

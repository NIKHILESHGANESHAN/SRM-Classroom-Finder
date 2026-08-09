"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";

type SuccessStateProps = {
  roomLabel: string;
  slotLabel: string;
  kind: "created" | "confirmed" | "already_reported";
  onReportAnother: () => void;
};

function messageForKind(kind: SuccessStateProps["kind"]): string {
  switch (kind) {
    case "confirmed":
      return "Thanks — your confirmation bumped the confidence on this room.";
    case "already_reported":
      return "You already reported this room for this slot today.";
    default:
      return "Classmates can now find this free room in Class Finder.";
  }
}

/**
 * Post-submit success: SVG checkmark stroke draw + delayed “Report another” CTA.
 */
export function SuccessState({
  roomLabel,
  slotLabel,
  kind,
  onReportAnother,
}: SuccessStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <motion.div
        initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : DURATION_UI,
          ease: EASE_OUT_EXPO,
        }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
      >
        <svg
          viewBox="0 0 52 52"
          className="h-12 w-12 text-primary"
          aria-hidden
        >
          <motion.path
            d="M14 27 L22 35 L38 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={
              reduceMotion ? { pathLength: 1 } : { pathLength: 0, opacity: 0 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: EASE_OUT_EXPO, delay: 0.1 }
            }
          />
        </svg>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          Report submitted
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{roomLabel}</span>
          {" · "}
          {slotLabel}
        </p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {messageForKind(kind)}
        </p>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { delay: 0.4, duration: DURATION_UI, ease: EASE_OUT_EXPO }
        }
      >
        <Button
          type="button"
          size="lg"
          className="min-h-11 px-8"
          onClick={onReportAnother}
        >
          Report another
        </Button>
      </motion.div>
    </div>
  );
}

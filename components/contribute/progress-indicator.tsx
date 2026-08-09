"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Building", "Floor", "Room", "Slot"] as const;

type ProgressIndicatorProps = {
  /** 0-based index of the active step (0–3). */
  step: number;
};

/**
 * Four-segment progress bar for the Contributor wizard.
 * Completed / active segments fill with animated width (layout-friendly).
 */
export function ProgressIndicator({ step }: ProgressIndicatorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full space-y-3" aria-label={`Step ${step + 1} of 4`}>
      <div className="flex gap-2">
        {STEP_LABELS.map((label, index) => {
          const filled = index <= step;
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: filled ? "100%" : "0%" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: DURATION_UI, ease: EASE_OUT_EXPO }
                  }
                />
              </div>
              <span
                className={cn(
                  "truncate text-center text-[11px] font-medium sm:text-xs",
                  filled ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MOTION_STANDARD, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Building", "Floor", "Room", "Confirm"] as const;

type ProgressIndicatorProps = {
  step: number;
};

export function ProgressIndicator({ step }: ProgressIndicatorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="w-full"
      role="status"
      aria-label={`Step ${step + 1} of 4: ${STEP_LABELS[step]}`}
    >
      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, index) => {
          const filled = index <= step;
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-cf-accent"
                  initial={false}
                  animate={{ width: filled ? "100%" : "0%" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }
                  }
                />
              </div>
              <span
                className={cn(
                  "truncate text-center text-[10px] font-medium sm:text-[11px]",
                  filled ? "text-cf-accent" : "text-muted-foreground",
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

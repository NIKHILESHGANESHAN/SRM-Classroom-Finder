"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EASE_OUT_EXPO,
  MOTION_MICRO,
  MOTION_STANDARD,
} from "@/lib/motion";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ClassFinderLoadingProps = {
  className?: string;
  /** Called when the CF → ClassFinder sequence finishes (no artificial delay). */
  onSequenceComplete?: () => void;
};

/**
 * Initial app loading identity: CF → C F → ClassFinder.
 * Non-looping — parent dismisses overlay when sequence completes and app is ready.
 */
export function ClassFinderLoading({
  className,
  onSequenceComplete,
}: ClassFinderLoadingProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      onSequenceComplete?.();
    }
  }, [reduceMotion, onSequenceComplete]);

  if (reduceMotion) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-background",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={`${PRODUCT_NAME} is starting`}
      >
        <p className="text-xl font-semibold tracking-tight text-foreground">
          {PRODUCT_NAME}
        </p>
      </div>
    );
  }

  const stage1End = MOTION_STANDARD;
  const stage2Duration = MOTION_STANDARD + MOTION_MICRO;
  const stage3Start = stage1End + stage2Duration;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-background",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`${PRODUCT_NAME} is starting`}
    >
      <div className="relative flex h-12 w-48 items-center justify-center">
        <motion.span
          className="absolute text-3xl font-bold tracking-tight text-cf-accent"
          initial={{ opacity: 1, letterSpacing: "-0.04em" }}
          animate={{ opacity: 0, letterSpacing: "-0.04em" }}
          transition={{
            duration: MOTION_MICRO,
            delay: stage1End,
            ease: EASE_OUT_EXPO,
          }}
          aria-hidden
        >
          CF
        </motion.span>

        <motion.span
          className="absolute text-3xl font-bold text-cf-accent"
          initial={{ opacity: 0, letterSpacing: "0.35em" }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: stage2Duration,
            delay: stage1End,
            times: [0, 0.12, 0.78, 1],
            ease: EASE_OUT_EXPO,
          }}
          aria-hidden
        >
          CF
        </motion.span>

        <motion.span
          className="absolute whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: MOTION_STANDARD,
            delay: stage3Start,
            ease: EASE_OUT_EXPO,
          }}
          onAnimationComplete={onSequenceComplete}
        >
          {PRODUCT_NAME}
        </motion.span>
      </div>
    </div>
  );
}

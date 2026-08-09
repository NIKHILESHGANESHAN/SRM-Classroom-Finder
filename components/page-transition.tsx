"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION_PAGE, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Subtle App Router cross-fade (~200ms).
 * Keyed by pathname so each navigation remounts with a soft enter/exit.
 * Opacity-only when prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={
          reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }
        }
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 0, y: -4, transition: { duration: DURATION_PAGE * 0.75 } }
        }
        transition={{ duration: DURATION_PAGE, ease: EASE_OUT_EXPO }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

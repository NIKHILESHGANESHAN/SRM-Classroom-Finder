"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { DURATION_PAGE, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Subtle App Router enter cross-fade (~200ms).
 * Enter-only (no AnimatePresence exit) — App Router replaces the tree before
 * exit can finish, which caused blank flashes and focus loss in QA.
 * Opacity-only / instant when prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION_PAGE, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

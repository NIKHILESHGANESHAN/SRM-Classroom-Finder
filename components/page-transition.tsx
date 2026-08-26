"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { DURATION_PAGE, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Subtle enter cross-fade on the first paint only (~150ms).
 * Client-side navigations render instantly — repeating the fade made route
 * changes feel sluggish even when the server responded in <20ms.
 * Enter-only (no AnimatePresence exit). Instant when prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const hasEnteredRef = useRef(false);

  useEffect(() => {
    hasEnteredRef.current = true;
  }, [pathname]);

  const animateEnter = !reduceMotion && !hasEnteredRef.current;

  return (
    <motion.div
      key={pathname}
      initial={animateEnter ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{
        duration: animateEnter ? DURATION_PAGE : 0,
        ease: EASE_OUT_EXPO,
      }}
    >
      {children}
    </motion.div>
  );
}

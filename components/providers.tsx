"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { AppToaster } from "@/components/app-toaster";
import { ClassFinderLoading } from "@/components/classfinder-loading";
import { ClassFinderHelpDeferred } from "@/components/help/classfinder-help-deferred";
import { DeviceTokenBootstrap } from "@/components/device-token-bootstrap";
import { PageTransition } from "@/components/page-transition";
import { EASE_OUT_EXPO, MOTION_MICRO } from "@/lib/motion";

/**
 * Client-side providers for theme (next-themes), toasts (sonner), anonymous
 * device-token bootstrap, route cross-fades, and the initial ClassFinder boot
 * sequence. Kept in a single boundary so the root layout stays a Server Component.
 */
const BOOT_SEEN_KEY = "cf-boot-seen";

export function Providers({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [appReady, setAppReady] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [bootNeeded, setBootNeeded] = useState(true);
  const showBoot = bootNeeded && !(appReady && sequenceDone);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BOOT_SEEN_KEY) === "1") {
        setBootNeeded(false);
        setSequenceDone(true);
      }
    } catch {
      /* private mode / blocked storage */
    }
    setAppReady(true);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setSequenceDone(true);
    }
  }, [reduceMotion]);

  const handleSequenceComplete = () => {
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setSequenceDone(true);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DeviceTokenBootstrap />
      <PageTransition>{children}</PageTransition>
      <ClassFinderHelpDeferred />
      <AppToaster />
      <AnimatePresence>
        {showBoot ? (
          <motion.div
            key="classfinder-boot"
            className="pointer-events-none fixed inset-0 z-[200]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : MOTION_MICRO,
              ease: EASE_OUT_EXPO,
            }}
          >
            <ClassFinderLoading onSequenceComplete={handleSequenceComplete} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ThemeProvider>
  );
}

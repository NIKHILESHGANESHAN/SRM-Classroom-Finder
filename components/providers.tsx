"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-toggle";
import { AppToaster } from "@/components/app-toaster";
import { XoEasterEggDeferred } from "@/components/easter-egg/xo-easter-egg-deferred";
import { SoundProvider } from "@/components/sound/sound-provider";
import { ClassFinderHelpDeferred } from "@/components/help/classfinder-help-deferred";
import { DeviceTokenBootstrap } from "@/components/device-token-bootstrap";
import { PageTransition } from "@/components/page-transition";
import { EASE_OUT_EXPO, MOTION_MICRO } from "@/lib/motion";

const ClassFinderLoading = dynamic(
  () =>
    import("@/components/classfinder-loading").then((m) => ({
      default: m.ClassFinderLoading,
    })),
  { ssr: false },
);

/**
 * Client-side providers for theme (next-themes), toasts (sonner), anonymous
 * device-token bootstrap, route cross-fades, and the initial ClassFinder boot
 * sequence. Kept in a single boundary so the root layout stays a Server Component.
 */
const BOOT_SEEN_KEY = "cf-boot-seen";

type BootPhase = "checking" | "skip" | "playing" | "done";

export function Providers({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [bootPhase, setBootPhase] = useState<BootPhase>("checking");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BOOT_SEEN_KEY) === "1") {
        setBootPhase("skip");
        return;
      }
    } catch {
      /* private mode / blocked storage */
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      try {
        sessionStorage.setItem(BOOT_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setBootPhase("skip");
      return;
    }

    setBootPhase("playing");
  }, []);

  const handleSequenceComplete = () => {
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setBootPhase("done");
  };

  const showBoot = bootPhase === "playing";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange={false}
    >
      <SoundProvider>
      <DeviceTokenBootstrap />
      <PageTransition>{children}</PageTransition>
      <ClassFinderHelpDeferred />
      <XoEasterEggDeferred />
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
      </SoundProvider>
    </ThemeProvider>
  );
}

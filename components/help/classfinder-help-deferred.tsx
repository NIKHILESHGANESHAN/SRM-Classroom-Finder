"use client";

import { useEffect, useState } from "react";
import { ClassFinderHelpGlobal } from "@/components/help/classfinder-help-global";

/**
 * Client-only mount gate for the global Help launcher.
 * Defers until the browser is idle so the homepage first paint stays lean.
 * The chat panel stays lazy inside ClassFinderHelpGlobal.
 */
export function ClassFinderHelpDeferred() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setMounted(true), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(() => setMounted(true), 400);
    return () => window.clearTimeout(timerId);
  }, []);

  if (!mounted) return null;
  return <ClassFinderHelpGlobal />;
}

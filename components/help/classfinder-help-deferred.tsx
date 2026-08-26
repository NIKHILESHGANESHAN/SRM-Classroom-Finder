"use client";

import { useEffect, useState } from "react";
import { ClassFinderHelpLazy } from "@/components/help/classfinder-help-lazy";

/**
 * Client-only mount gate for the global Help launcher.
 * The heavy chat panel stays lazy inside ClassFinderHelpGlobal; this only
 * waits for hydration — not requestIdleCallback (unreliable in preview
 * iframes / busy main threads and was leaving the launcher absent for seconds).
 */
export function ClassFinderHelpDeferred() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <ClassFinderHelpLazy />;
}

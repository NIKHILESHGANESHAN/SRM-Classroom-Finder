"use client";

import { useEffect, useState } from "react";
import { ClassFinderHelpGlobal } from "@/components/help/classfinder-help-global";

/**
 * Client-only mount gate for the global Help launcher.
 * The shell renders synchronously after hydration — no nested next/dynamic
 * boundary (that silently rendered nothing when async chunks failed on Netlify).
 * The chat panel stays lazy inside ClassFinderHelpGlobal.
 */
export function ClassFinderHelpDeferred() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <ClassFinderHelpGlobal />;
}

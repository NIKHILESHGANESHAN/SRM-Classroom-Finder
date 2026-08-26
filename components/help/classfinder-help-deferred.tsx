"use client";

import { useEffect, useState } from "react";
import { ClassFinderHelpLazy } from "@/components/help/classfinder-help-lazy";

/**
 * Defers the global Help launcher chunk until the browser is idle.
 * Keeps first-route hydration focused on page content.
 */
export function ClassFinderHelpDeferred() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setMount(true), {
        timeout: 2000,
      });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(() => setMount(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return mount ? <ClassFinderHelpLazy /> : null;
}

"use client";

import dynamic from "next/dynamic";

/** Lazy global Help shell — keeps shared First Load JS small until hydration. */
export const ClassFinderHelpLazy = dynamic(
  () =>
    import("@/components/help/classfinder-help-global").then((m) => ({
      default: m.ClassFinderHelpGlobal,
    })),
  { ssr: false },
);

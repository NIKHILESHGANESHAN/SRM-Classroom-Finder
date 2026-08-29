"use client";

import { useSyncExternalStore } from "react";

function subscribeMediaQuery(
  query: string,
  onChange: () => void,
): () => void {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Subscribe to a CSS media query via useSyncExternalStore.
 * Returns `false` during SSR — mobile-first layouts render until hydrated.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMediaQuery(query, onChange),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useSound } from "@/components/sound/sound-provider";

/**
 * Plays open/close UI sounds when a panel or dialog visibility changes.
 */
export function useSoundOnOpen(open: boolean): void {
  const { play } = useSound();
  const prevRef = useRef(open);

  useEffect(() => {
    if (open && !prevRef.current) {
      play("open");
    } else if (!open && prevRef.current) {
      play("close");
    }
    prevRef.current = open;
  }, [open, play]);
}

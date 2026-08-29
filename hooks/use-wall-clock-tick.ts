"use client";

import { useEffect, useState } from "react";

type TickListener = () => void;

let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<TickListener>();

function ensureInterval(): void {
  if (intervalId !== null || typeof window === "undefined") return;
  intervalId = setInterval(() => {
    listeners.forEach((listener) => listener());
  }, 1000);
}

function maybeClearInterval(): void {
  if (listeners.size === 0 && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function subscribe(listener: TickListener): () => void {
  listeners.add(listener);
  ensureInterval();
  return () => {
    listeners.delete(listener);
    maybeClearInterval();
  };
}

/**
 * Shared 1 Hz wall clock for countdown UIs.
 * One timer serves all subscribers (e.g. every FreeCountdown on Finder).
 */
export function useWallClockTick(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribe(() => setNow(Date.now())), []);

  return now;
}

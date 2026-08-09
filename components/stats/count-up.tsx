"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

type CountUpProps = {
  value: number;
  durationMs?: number;
  className?: string;
  /** Suffix after the number, e.g. " reports" */
  suffix?: string;
  decimals?: number;
};

/**
 * Animated count-up for Stats KPIs. Instant when prefers-reduced-motion.
 */
export function CountUp({
  value,
  durationMs = 900,
  className,
  suffix = "",
  decimals = 0,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // useReducedMotion() is null on the first SSR/hydration paint — treat as animate
    if (reduceMotion === true) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDisplay(value);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString("en-IN");

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}

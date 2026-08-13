"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { formatMinutesAsLabel } from "@/lib/slots";
import { cn } from "@/lib/utils";

type CountdownProps = {
  /** Campus calendar date YYYY-MM-DD */
  reportDate: string;
  /** Slot end as minutes from midnight IST */
  endMinutes: number;
};

function expiryMs(reportDate: string, endMinutes: number): number {
  const h = Math.floor(endMinutes / 60);
  const m = endMinutes % 60;
  const iso = `${reportDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`;
  return new Date(iso).getTime();
}

function remainingMs(
  reportDate: string,
  endMinutes: number,
  now: number,
): number {
  return Math.max(0, expiryMs(reportDate, endMinutes) - now);
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m left`;
  }
  if (mins > 0) return `${mins} min ${secs.toString().padStart(2, "0")}s left`;
  return `${secs}s left`;
}

/** Linear interpolate channel 0–255 */
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * Smooth green → amber (under 5 min) → red (under 2 min) via RGB blend.
 * Avoids hard class cutovers while still using CSS transition as a safety net.
 */
function countdownColor(ms: number, dark: boolean): string {
  if (ms <= 0) return dark ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)";

  const green = dark ? [52, 211, 153] : [5, 150, 105];
  const amber = dark ? [251, 191, 36] : [217, 119, 6];
  const red = dark ? [248, 113, 113] : [220, 38, 38];

  const five = 5 * 60 * 1000;
  const two = 2 * 60 * 1000;

  if (ms >= five) {
    return `rgb(${green[0]}, ${green[1]}, ${green[2]})`;
  }
  if (ms >= two) {
    // 5 min → 2 min: green → amber
    const t = 1 - (ms - two) / (five - two);
    return `rgb(${lerp(green[0], amber[0], t)}, ${lerp(green[1], amber[1], t)}, ${lerp(green[2], amber[2], t)})`;
  }
  // 2 min → 0: amber → red
  const t = 1 - ms / two;
  return `rgb(${lerp(amber[0], red[0], t)}, ${lerp(amber[1], red[1], t)}, ${lerp(amber[2], red[2], t)})`;
}

/**
 * Live “Free until … · X min left” badge.
 * Tabular numbers; smooth color blend; pulse under 2 minutes (reduced-motion safe).
 */
export function FreeCountdown({ reportDate, endMinutes }: CountdownProps) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const ms = remainingMs(reportDate, endMinutes, now);
  const untilLabel = formatMinutesAsLabel(endMinutes);
  const color = useMemo(() => countdownColor(ms, dark), [ms, dark]);
  const urgent = ms > 0 && ms < 2 * 60 * 1000;
  const endingSoon = ms > 0 && ms < 5 * 60 * 1000;

  if (ms <= 0) {
    return (
      <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2.5 text-xs font-medium text-muted-foreground tabular-nums">
        Expired
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg bg-muted/80 px-2.5 text-xs font-medium tabular-nums transition-[color] duration-500 ease-out",
        urgent && !reduceMotion && "countdown-pulse",
      )}
      style={{ color }}
      aria-live="polite"
      aria-atomic="true"
    >
      Free until {untilLabel}
      <span className="mx-1.5 opacity-50">·</span>
      <span className="tabular-nums font-semibold">{formatRemaining(ms)}</span>
      {endingSoon ? (
        <span className="ml-1.5 font-semibold">
          {urgent ? "· Ending now" : "· Ending soon"}
        </span>
      ) : null}
    </span>
  );
}

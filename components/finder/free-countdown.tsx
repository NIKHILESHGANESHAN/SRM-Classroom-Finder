"use client";

import { useEffect, useState } from "react";
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

function toneForMs(ms: number): "green" | "amber" | "red" | "gone" {
  if (ms <= 0) return "gone";
  if (ms < 2 * 60 * 1000) return "red";
  if (ms < 5 * 60 * 1000) return "amber";
  return "green";
}

const TONE_CLASS: Record<Exclude<ReturnType<typeof toneForMs>, "gone">, string> = {
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

/**
 * Live “Free until … · X min left” badge.
 * Color transitions via CSS `transition-colors` (not discrete class hard-cuts only).
 * Under 2 minutes: slow pulse (honours prefers-reduced-motion).
 */
export function FreeCountdown({ reportDate, endMinutes }: CountdownProps) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = remainingMs(reportDate, endMinutes, now);
  const tone = toneForMs(ms);
  const untilLabel = formatMinutesAsLabel(endMinutes);

  if (tone === "gone") {
    return (
      <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2.5 text-xs font-medium text-muted-foreground tabular-nums">
        Expired
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg bg-muted/80 px-2.5 text-xs font-medium tabular-nums transition-colors duration-500",
        TONE_CLASS[tone],
        tone === "red" && !reduceMotion && "countdown-pulse",
      )}
    >
      Free until {untilLabel}
      <span className="mx-1.5 text-muted-foreground/70">·</span>
      <span className="tabular-nums">{formatRemaining(ms)}</span>
    </span>
  );
}

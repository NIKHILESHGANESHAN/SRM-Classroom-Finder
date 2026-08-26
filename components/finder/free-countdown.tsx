"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
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

/**
 * Live availability countdown — accurate wall-clock, text-first (not color-only).
 */
export function FreeCountdown({ reportDate, endMinutes }: CountdownProps) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = remainingMs(reportDate, endMinutes, now);
  const untilLabel = formatMinutesAsLabel(endMinutes);
  const urgent = ms > 0 && ms < 2 * 60 * 1000;
  const endingSoon = ms > 0 && ms <= 10 * 60 * 1000;

  if (ms <= 0) {
    return (
      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        Expired
      </p>
    );
  }

  return (
    <div
      className="space-y-0.5"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        endingSoon
          ? `Ending soon, free until ${untilLabel}, ${formatRemaining(ms)}`
          : `Free until ${untilLabel}, ${formatRemaining(ms)}`
      }
    >
      <p
        className={cn(
          "type-room text-foreground",
          urgent && "text-amber-700 dark:text-amber-300",
        )}
      >
        {urgent ? (
          <span className="inline-flex items-center gap-1.5">
            {!reduceMotion ? (
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            ) : null}
            Ending soon
          </span>
        ) : (
          <>Free until {untilLabel}</>
        )}
      </p>
      <p className="text-sm tabular-nums text-muted-foreground">
        {formatRemaining(ms)}
      </p>
    </div>
  );
}

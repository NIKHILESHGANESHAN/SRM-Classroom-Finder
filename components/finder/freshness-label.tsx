"use client";

import { Clock, Leaf, Sprout, Timer } from "lucide-react";
import { deriveFreshness, type FreshnessKind } from "@/lib/report-display";
import { cn } from "@/lib/utils";

const ICONS: Record<FreshnessKind, typeof Leaf> = {
  very_fresh: Leaf,
  fresh: Sprout,
  aging: Clock,
  stale: Timer,
};

type FreshnessLabelProps = {
  lastVerifiedAt: string;
  nowMs?: number;
};

/** Text + icon freshness. Color is supplementary only. */
export function FreshnessLabel({ lastVerifiedAt, nowMs }: FreshnessLabelProps) {
  const display = deriveFreshness(
    new Date(lastVerifiedAt),
    new Date(nowMs ?? Date.now()),
  );
  const Icon = ICONS[display.kind];

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1.5 text-xs font-medium",
        display.kind === "very_fresh" && "text-emerald-800 dark:text-emerald-300",
        display.kind === "fresh" && "text-foreground/80",
        display.kind === "aging" && "text-amber-900 dark:text-amber-200",
        display.kind === "stale" && "text-muted-foreground",
      )}
      aria-label={display.ariaLabel}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {display.label}
        <span className="font-normal text-muted-foreground">
          {" "}
          · {display.detail}
        </span>
      </span>
    </p>
  );
}

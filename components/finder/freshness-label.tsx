"use client";

import { Clock } from "lucide-react";
import { deriveFreshness } from "@/lib/report-display";
import { cn } from "@/lib/utils";

type FreshnessLabelProps = {
  lastVerifiedAt: string;
  nowMs?: number;
};

function humanFreshnessCopy(
  lastVerifiedAt: string,
  nowMs?: number,
): { text: string; ariaLabel: string } {
  const display = deriveFreshness(
    new Date(lastVerifiedAt),
    new Date(nowMs ?? Date.now()),
  );

  if (display.kind === "very_fresh") {
    return {
      text: "Just reported",
      ariaLabel: "Just reported",
    };
  }

  const detail = display.detail.replace(/^Verified /, "");
  const text =
    detail === "just now" ? "Just reported" : `Last confirmed ${detail}`;

  return {
    text,
    ariaLabel: display.ariaLabel.replace(/Very [Ff]resh|Fresh|Aging|Stale,? /, ""),
  };
}

/** Human-readable freshness — no robotic tier labels on the card. */
export function FreshnessLabel({ lastVerifiedAt, nowMs }: FreshnessLabelProps) {
  const { text, ariaLabel } = humanFreshnessCopy(lastVerifiedAt, nowMs);

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground",
      )}
      aria-label={ariaLabel}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

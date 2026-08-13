"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatUpdatedAgo } from "@/lib/finder-realtime";
import { cn } from "@/lib/utils";

type FinderLiveStatusProps = {
  lastUpdatedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
};

export function FinderLiveStatus({
  lastUpdatedAt,
  refreshing,
  onRefresh,
}: FinderLiveStatusProps) {
  const reduceMotion = useReducedMotion();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const ago = formatUpdatedAgo(lastUpdatedAt, nowMs);

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 text-xs text-muted-foreground">
      <p className="inline-flex min-w-0 flex-1 items-center gap-2 leading-snug">
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400",
            refreshing && !reduceMotion && "opacity-70",
          )}
          aria-hidden
        />
        <span>
          <span className="font-medium text-foreground/80">Live</span>
          <span className="mx-1.5 opacity-50">·</span>
          Updates automatically
          <span className="mx-1.5 opacity-50">·</span>
          {ago}
        </span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11 shrink-0"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={refreshing ? "Refreshing classroom list" : "Refresh classroom list"}
      >
        <RefreshCw
          className={cn(
            "h-4 w-4",
            refreshing && !reduceMotion && "animate-spin",
          )}
          aria-hidden
        />
      </Button>
    </div>
  );
}

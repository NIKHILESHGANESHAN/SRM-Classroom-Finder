"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/finder/confidence-badge";
import { FreeCountdown } from "@/components/finder/free-countdown";
import { Button } from "@/components/ui/button";
import type { ActiveFreeClassroom } from "@/lib/finder-data";

type ClassroomCardProps = {
  room: ActiveFreeClassroom;
  index: number;
};

/**
 * Free-classroom card. Report button is wired for Phase 7 modal (toast stub now).
 */
export function ClassroomCard({ room, index }: ClassroomCardProps) {
  const reduceMotion = useReducedMotion();

  function handleReport() {
    // Phase 7: open responsive Sheet/Dialog. Button is interactive today.
    toast.message("Report", {
      description: `Flagging ${room.buildingCode} ${room.roomNumber} — report modal ships next.`,
    });
  }

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }
      }
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : {
              duration: 0.3,
              delay: Math.min(index, 12) * 0.03,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-primary">
            {room.roomNumber}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {room.buildingCode} · {room.buildingName} · Floor {room.floorNumber}
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/80">
            Slot {room.slotOrder} · {room.slotRangeLabel}
          </p>
        </div>
        <ConfidenceBadge
          status={room.status}
          confirmationCount={room.confirmationCount}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <FreeCountdown
          reportDate={room.reportDate}
          endMinutes={room.endMinutes}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5"
          onClick={handleReport}
        >
          <Flag className="h-4 w-4" aria-hidden />
          Report
        </Button>
      </div>
    </motion.article>
  );
}

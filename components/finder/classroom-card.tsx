"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flag } from "lucide-react";
import { ConfidenceBadge } from "@/components/finder/confidence-badge";
import { FreeCountdown } from "@/components/finder/free-countdown";
import { ReportModal } from "@/components/finder/report-modal";
import { Button } from "@/components/ui/button";
import type { ActiveFreeClassroom } from "@/lib/finder-data";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";

type ClassroomCardProps = {
  room: ActiveFreeClassroom;
  index: number;
  /** Remove this card from the Finder list (AnimatePresence collapse). */
  onRemove: (freeReportId: string) => void;
};

/**
 * Free-classroom card with staggered entrance, layout reflow, and collapse exit.
 */
export function ClassroomCard({ room, index, onRemove }: ClassroomCardProps) {
  const reduceMotion = useReducedMotion();
  const [reportOpen, setReportOpen] = useState(false);

  const roomLabel = `${room.buildingCode} ${room.roomNumber}`;

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: reduceMotion
          ? { duration: 0.12 }
          : {
              duration: DURATION_UI,
              delay: Math.min(index, 12) * 0.03,
              ease: EASE_OUT_EXPO,
            },
      }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : {
              opacity: 0,
              height: 0,
              marginBottom: 0,
              paddingTop: 0,
              paddingBottom: 0,
              overflow: "hidden",
              transition: {
                duration: 0.35,
                ease: EASE_OUT_EXPO,
              },
            }
      }
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 dark:shadow-black/30"
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
          onClick={() => setReportOpen(true)}
        >
          <Flag className="h-4 w-4" aria-hidden />
          Report
        </Button>
      </div>

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        freeReportId={room.freeReportId}
        roomLabel={roomLabel}
        onHidden={() => onRemove(room.freeReportId)}
      />
    </motion.article>
  );
}

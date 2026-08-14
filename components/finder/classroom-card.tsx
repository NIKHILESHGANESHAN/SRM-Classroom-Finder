"use client";

import { memo, useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flag, Share2, ThumbsUp } from "lucide-react";
import { ConfidenceBadge } from "@/components/finder/confidence-badge";
import { FreeCountdown } from "@/components/finder/free-countdown";
import { FreshnessLabel } from "@/components/finder/freshness-label";
import { ReportModal } from "@/components/finder/report-modal";
import { Button } from "@/components/ui/button";
import { useDeviceToken } from "@/hooks/use-device-token";
import { submitStillFree } from "@/lib/actions/still-free";
import type { ActiveFreeClassroom } from "@/lib/finder-data";
import {
  browserShareAdapters,
  shareClassroomLink,
} from "@/lib/classroom-share";
import { roomUpdateSignature } from "@/lib/finder-realtime";
import type { RecentRoom } from "@/lib/local-preferences";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ClassroomCardProps = {
  room: ActiveFreeClassroom;
  index: number;
  onRemove: (freeReportId: string) => void;
  onNeedRefresh?: () => void;
  onShared?: (room: Omit<RecentRoom, "savedAt">) => void;
  emphasized?: boolean;
};

function isNetworkFailure(error: unknown, serverMessage?: string): boolean {
  if (serverMessage === "Couldn't submit your report.") return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : "";
  return /fetch|network|failed/i.test(message);
}

function ClassroomCardInner({
  room,
  index,
  onRemove,
  onNeedRefresh,
  onShared,
  emphasized = false,
}: ClassroomCardProps) {
  const reduceMotion = useReducedMotion();
  const deviceToken = useDeviceToken();
  const articleRef = useRef<HTMLElement | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [stillFreeError, setStillFreeError] = useState<string | null>(null);
  const [stillFreeRetry, setStillFreeRetry] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [stillFreePending, startStillFree] = useTransition();

  const roomLabel = `${room.buildingCode} ${room.roomNumber}`;

  useEffect(() => {
    if (!emphasized || !articleRef.current) return;
    articleRef.current.scrollIntoView({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [emphasized, reduceMotion]);

  async function handleShare() {
    if (sharePending) return;
    setSharePending(true);
    try {
      const outcome = await shareClassroomLink(
        {
          origin: window.location.origin,
          buildingCode: room.buildingCode,
          floorNumber: room.floorNumber,
          roomNumber: room.roomNumber,
        },
        browserShareAdapters(),
      );
      if (outcome === "shared" || outcome === "copied") {
        onShared?.({
          buildingCode: room.buildingCode,
          floorNumber: room.floorNumber,
          roomNumber: room.roomNumber,
        });
      }
      if (outcome === "copied") {
        toast.success("Classroom link copied.");
      } else if (outcome === "failed") {
        toast.error("Unable to copy the link. Please copy it manually.");
      }
    } finally {
      setSharePending(false);
    }
  }

  function handleStillFree() {
    setStillFreeError(null);
    setStillFreeRetry(false);
    startStillFree(async () => {
      try {
        const result = await submitStillFree({
          freeReportId: room.freeReportId,
          deviceToken: deviceToken ?? undefined,
        });
        if (!result.ok) {
          if (result.error === "Couldn't submit your report.") {
            setStillFreeRetry(true);
            setStillFreeError(result.error);
            return;
          }
          toast.error(result.error);
          return;
        }
        if (result.kind === "already_reported") {
          toast.success("Already confirmed from this device");
          onNeedRefresh?.();
          return;
        }
        toast.success("Marked still free");
        onNeedRefresh?.();
      } catch (error) {
        if (isNetworkFailure(error)) {
          setStillFreeRetry(true);
          setStillFreeError("Couldn't submit your report.");
          return;
        }
        toast.error("Couldn't submit your report.");
      }
    });
  }

  return (
    <motion.article
      ref={articleRef}
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
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5 dark:shadow-black/30",
        emphasized && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      data-shared-room={emphasized ? "true" : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-primary">
            {room.roomNumber}
          </h3>
          {emphasized ? (
            <p className="sr-only">Shared classroom</p>
          ) : null}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {room.buildingCode} · {room.buildingName} · Floor {room.floorNumber}
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/80">
            Slot {room.slotOrder} · {room.slotRangeLabel}
          </p>
          <FreshnessLabel lastVerifiedAt={room.lastVerifiedAt} />
        </div>
        <ConfidenceBadge
          status={room.status}
          confirmationCount={room.confirmationCount}
          occupiedStrikeCount={room.occupiedStrikeCount}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <FreeCountdown
          reportDate={room.reportDate}
          endMinutes={room.endMinutes}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 gap-1.5"
          onClick={handleStillFree}
          disabled={stillFreePending}
          aria-label={`Mark ${roomLabel} still free`}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden />
          {stillFreePending ? "Submitting…" : "Still Free"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-1.5"
          onClick={() => setReportOpen(true)}
          aria-label={`Report ${roomLabel} occupied`}
        >
          <Flag className="h-4 w-4" aria-hidden />
          Report Occupied
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 gap-1.5 sm:col-span-2"
          onClick={() => {
            void handleShare();
          }}
          disabled={sharePending}
          aria-label={`Share ${roomLabel}`}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {sharePending ? "Sharing…" : "Share"}
        </Button>
      </div>

      {stillFreeRetry ? (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">{stillFreeError}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={handleStillFree}
            disabled={stillFreePending}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        freeReportId={room.freeReportId}
        roomLabel={roomLabel}
        onHidden={() => {
          onRemove(room.freeReportId);
          onNeedRefresh?.();
        }}
      />
    </motion.article>
  );
}

export const ClassroomCard = memo(ClassroomCardInner, (prev, next) => {
  return (
    roomUpdateSignature(prev.room) === roomUpdateSignature(next.room) &&
    prev.room.roomNumber === next.room.roomNumber &&
    prev.index === next.index &&
    prev.emphasized === next.emphasized &&
    prev.onRemove === next.onRemove &&
    prev.onNeedRefresh === next.onNeedRefresh &&
    prev.onShared === next.onShared
  );
});
ClassroomCard.displayName = "ClassroomCard";

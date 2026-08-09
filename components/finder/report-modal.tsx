"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showReportToast } from "@/components/finder/report-toast";
import { useDeviceToken } from "@/hooks/use-device-token";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  submitOccupiedReport,
  type ReportReason,
} from "@/lib/actions/report";

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "occupied", label: "Occupied" },
  { value: "class_in_progress", label: "Class in progress" },
  { value: "wrong_info", label: "Wrong info" },
  { value: "duplicate", label: "Already reported" },
];

type ReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freeReportId: string;
  roomLabel: string;
  /** Called when the free report should leave the Finder list (2-strike hide). */
  onHidden: () => void;
};

function ReportFormBody({
  reason,
  onReasonChange,
  error,
  pending,
  onCancel,
  onSubmit,
}: {
  reason: ReportReason | "";
  onReasonChange: (value: ReportReason) => void;
  error: string | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="report-reason">Reason</Label>
        <Select
          value={reason || undefined}
          onValueChange={(v) => onReasonChange(v as ReportReason)}
          disabled={pending}
        >
          <SelectTrigger id="report-reason" className="min-h-11">
            <SelectValue placeholder="Why are you flagging this?" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="min-h-11"
          onClick={onSubmit}
          disabled={pending || !reason}
        >
          {pending ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Responsive report UI: bottom Sheet on mobile, centered Dialog on desktop.
 */
export function ReportModal({
  open,
  onOpenChange,
  freeReportId,
  roomLabel,
  onHidden,
}: ReportModalProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const deviceToken = useDeviceToken();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetAndClose() {
    setReason("");
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!reason) {
      setError("Pick a reason before submitting.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await submitOccupiedReport({
        freeReportId,
        reason,
        deviceToken: deviceToken ?? undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      resetAndClose();

      if (result.kind === "already_reported") {
        showReportToast("already_reported", roomLabel);
        if (result.hidden) onHidden();
        return;
      }

      if (result.hidden) {
        showReportToast("hidden", roomLabel);
        onHidden();
        return;
      }

      showReportToast("created", roomLabel);
    });
  }

  const title = "Report free room";
  const description = `Flag ${roomLabel} if it isn’t actually free. Your device token is used anonymously — one report per room.`;

  const form = (
    <ReportFormBody
      reason={reason}
      onReasonChange={setReason}
      error={error}
      pending={pending}
      onCancel={resetAndClose}
      onSubmit={handleSubmit}
    />
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setReason("");
            setError(null);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">{form}</div>
      </SheetContent>
    </Sheet>
  );
}

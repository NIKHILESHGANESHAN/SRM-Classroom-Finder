"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setClassroomActive } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  classroomId: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  isActive: boolean;
  canActivate: boolean;
};

export function ClassroomActiveToggle({
  classroomId,
  buildingCode,
  floorNumber,
  roomNumber,
  isActive,
  canActivate,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const roomLabel = `${buildingCode} ${roomNumber} (Floor ${floorNumber})`;

  function runToggle() {
    start(async () => {
      const result = await setClassroomActive({
        classroomId,
        isActive: !isActive,
      });
      if (result.ok) {
        toast.success(
          isActive
            ? `${roomLabel} deactivated.`
            : `${roomLabel} activated.`,
        );
        setConfirmOpen(false);
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  if (isActive) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className="btn-press min-h-11"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          Deactivate
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="rounded-surface sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Deactivate {buildingCode} {roomNumber}?</DialogTitle>
              <DialogDescription>
                New reports will no longer be accepted for this room. Existing
                historical records will remain intact.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="btn-press min-h-11"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="btn-press min-h-11"
                disabled={pending}
                onClick={runToggle}
              >
                {pending ? "Saving…" : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      type="button"
      variant="default"
      className="btn-press min-h-11"
      disabled={pending || !canActivate}
      title={
        canActivate
          ? undefined
          : "Not in official inventory — cannot activate."
      }
      onClick={runToggle}
    >
      {pending ? "Saving…" : "Activate"}
    </Button>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid3X3, X } from "lucide-react";
import { XoGame } from "@/components/easter-egg/xo-game";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSoundOnOpen } from "@/hooks/use-sound-on-open";

type XoEasterEggDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Easter Egg shell — premium XO mini-game in a modal dialog.
 */
export function XoEasterEggDialog({ open, onOpenChange }: XoEasterEggDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [streak, setStreak] = useState(0);

  useSoundOnOpen(open);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) {
        router.push("/");
      }
    },
    [onOpenChange, router],
  );

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  useEffect(() => {
    if (!open) {
      setStreak(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "glass-surface glass-surface--prominent max-w-md gap-0 border-0 p-0 shadow-glass sm:rounded-sheet",
        )}
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cf-accent-muted text-cf-accent">
              <Grid3X3 className="h-5 w-5" aria-hidden />
            </div>
            <DialogTitle id={titleId} className="text-xl">
              XO
            </DialogTitle>
            <DialogDescription id={descId} className="text-sm leading-relaxed">
              A quiet corner of ClassFinder. Beat the computer if you can.
            </DialogDescription>
          </DialogHeader>
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0"
            onClick={handleClose}
            aria-label="Close XO game"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {open ? (
            <XoGame streak={streak} onStreakChange={setStreak} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

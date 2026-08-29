"use client";

import { Moon } from "lucide-react";
import Link from "next/link";
import { GlassNavigation } from "@/components/glass";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ContributeAfterHoursProps = {
  open?: boolean;
};

/**
 * Evening Easter Egg — reporting closed, Finder still available.
 * Not dismissible; only exit is Back to Finder.
 */
export function ContributeAfterHours({ open = true }: ContributeAfterHoursProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-lg">
      <GlassNavigation
        aria-label="Contributor navigation"
        className="flex items-center gap-2 px-2 py-2 sm:px-3"
      >
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-base font-semibold text-foreground">
            Report a room
          </h1>
          <p className="truncate text-xs text-muted-foreground">{PRODUCT_NAME}</p>
        </div>
      </GlassNavigation>

      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            "glass-surface glass-surface--prominent max-w-md gap-0 border-0 p-6 shadow-glass sm:rounded-sheet sm:p-8",
          )}
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cf-accent-muted text-cf-accent">
              <Moon className="h-5 w-5" aria-hidden />
            </div>
            <DialogTitle id="after-hours-title" className="text-xl">
              Good evening.
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              College hours are over — classrooms can rest too. See you tomorrow!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button asChild className="min-h-11 w-full">
              <Link href="/finder">Back to Finder</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { Moon } from "lucide-react";
import { GlassNavigation } from "@/components/glass";
import { ClassFinderNavTitle } from "@/components/brand/classfinder-nav-title";
import { EasterEggEntryActions } from "@/components/easter-egg/easter-egg-entry-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NIGHT_EGG_MESSAGE =
  "[EASTER EGG UNLOCKED] 🌟 Congrats! You found the hidden bedtime protocol. Here is your reward: Permission to completely stop caring about assignments for the next 8 hours. Your future is incredibly bright, but it requires a fully charged battery. Log off, dream of world domination (or just passing finals), and go change the world tomorrow.Action Required: Close this app. Close your eyes.Initiating system shutdown in 3... 2... 1... Good night! 😴";

type ContributeNightProps = {
  open?: boolean;
};

/**
 * Night Easter Egg — 21:00–03:59 IST. Reporting closed, Finder still available.
 * Not dismissible; Play XO or Home only (no Report / Finder shortcuts).
 */
export function ContributeNight({ open = true }: ContributeNightProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-lg">
      <GlassNavigation
        aria-label="Contributor navigation"
        className="flex items-center gap-2 px-2 py-2 sm:px-3"
      >
        <ClassFinderNavTitle title="Report a room" />
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
            <DialogTitle id="night-egg-title" className="text-xl">
              Bedtime protocol
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              {NIGHT_EGG_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <EasterEggEntryActions />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { disabledSlotTooltip } from "@/lib/slots";
import type { TimeSlotOption } from "@/lib/contribute-data";
import { SPRING_PILL } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SlotPickerProps = {
  slots: TimeSlotOption[];
  value: string | null;
  onChange: (slotId: string) => void;
};

/**
 * Segmented time-slot control with a shared-layout sliding pill (`layoutId`).
 * Disabled slots: greyed, cursor-not-allowed, tooltip (hover + native title for touch).
 */
export function SlotPicker({ slots, value, onChange }: SlotPickerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <LayoutGroup id="slot-picker">
        <div
          role="radiogroup"
          aria-label="Time slot"
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {slots.map((slot) => {
            const selected = value === slot.id;
            const disabled = !slot.selectable;
            const tip = disabled
              ? disabledSlotTooltip(slot.startMinutes, slot.endMinutes)
              : undefined;

            const button = (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={disabled}
                disabled={disabled}
                title={tip}
                onClick={() => onChange(slot.id)}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "cursor-pointer text-foreground hover:bg-secondary/80",
                  selected && !disabled && "text-primary-foreground",
                )}
              >
                {selected && !disabled && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "slot-pill"}
                    className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                    transition={reduceMotion ? { duration: 0 } : SPRING_PILL}
                  />
                )}
                <span className="relative z-10 text-sm font-semibold">
                  {slot.slotOrder}
                </span>
                <span
                  className={cn(
                    "relative z-10 mt-0.5 text-[10px] leading-tight sm:text-[11px]",
                    selected && !disabled
                      ? "text-primary-foreground/85"
                      : "text-muted-foreground",
                  )}
                >
                  {slot.rangeLabel}
                </span>
              </button>
            );

            if (!disabled) {
              return (
                <div key={slot.id} className="relative">
                  {button}
                </div>
              );
            }

            return (
              <Tooltip key={slot.id}>
                <TooltipTrigger asChild>
                  <div className="relative rounded-xl bg-muted/40">{button}</div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[240px] text-center text-xs"
                >
                  {tip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </LayoutGroup>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Only the current period (±5 min grace) can be reported.
      </p>
    </TooltipProvider>
  );
}

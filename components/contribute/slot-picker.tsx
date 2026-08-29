"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { disabledSlotTooltip } from "@/lib/slots";
import type { TimeSlotOption } from "@/lib/contribute-data";
import { useSound } from "@/components/sound/sound-provider";
import { cn } from "@/lib/utils";

type SlotPickerProps = {
  slots: TimeSlotOption[];
  value: string | null;
  onChange: (slotId: string) => void;
};

function selectedSlotClasses(selected: boolean, disabled: boolean): string {
  if (disabled) {
    return "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50";
  }
  if (selected) {
    return "border-cf-accent bg-cf-accent-muted text-foreground ring-2 ring-cf-accent/25";
  }
  return "border-border bg-card text-foreground hover:border-cf-accent/40 hover:bg-muted/40";
}

/**
 * Time-slot grid — solid surfaces, clear selected state (no glass pills).
 */
export function SlotPicker({ slots, value, onChange }: SlotPickerProps) {
  const { play } = useSound();

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div
        role="radiogroup"
        aria-label="Time slot"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
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
              aria-label={
                disabled && tip
                  ? `Period ${slot.slotOrder}, ${slot.rangeLabel}. ${tip}`
                  : `Period ${slot.slotOrder}, ${slot.rangeLabel}`
              }
              disabled={disabled}
              onClick={() => {
                play("select");
                onChange(slot.id);
              }}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-button border px-2 py-2 text-center transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selectedSlotClasses(selected, disabled),
              )}
            >
              <span className="text-sm font-semibold tabular-nums">
                Period {slot.slotOrder}
              </span>
              <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {slot.rangeLabel}
              </span>
            </button>
          );

          if (!disabled) {
            return <div key={slot.id}>{button}</div>;
          }

          return (
            <Tooltip key={slot.id}>
              <TooltipTrigger asChild>
                <div>{button}</div>
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
      <p className="mt-3 text-xs text-muted-foreground">
        Only the current period (±5 min grace) can be reported.
      </p>
    </TooltipProvider>
  );
}

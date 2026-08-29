"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSound } from "@/components/sound/sound-provider";
import { cn } from "@/lib/utils";

type SoundToggleProps = {
  className?: string;
};

/**
 * Global sound on/off control — persists to localStorage.
 */
export function SoundToggle({ className }: SoundToggleProps) {
  const { enabled, toggle } = useSound();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("min-h-11 min-w-11", className)}
            onClick={() => toggle()}
            aria-label={enabled ? "Mute sounds" : "Enable sounds"}
            aria-pressed={enabled}
            title={enabled ? "Mute sounds" : "Enable sounds"}
          >
            {enabled ? (
              <Volume2 className="h-5 w-5" aria-hidden />
            ) : (
              <VolumeX className="h-5 w-5" aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {enabled ? "Sounds on" : "Sounds off"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

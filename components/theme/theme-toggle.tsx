"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSound } from "@/components/sound/sound-provider";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "cf-theme";

type ThemeToggleProps = {
  className?: string;
};

function enableThemeTransition() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.add("theme-transition");
  window.setTimeout(() => root.classList.remove("theme-transition"), 300);
}

/**
 * Light/dark theme toggle — Sun in light mode, Moon in dark mode.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { play } = useSound();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const tooltip = isDark ? "Light mode" : "Dark mode";

  function handleToggle() {
    play("click");
    enableThemeTransition();
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("min-h-11 min-w-11", className)}
            onClick={handleToggle}
            aria-label={mounted ? label : "Toggle color theme"}
            aria-pressed={mounted ? isDark : undefined}
            title={mounted ? tooltip : "Toggle color theme"}
            disabled={!mounted}
          >
            {mounted ? (
              isDark ? (
                <Moon className="h-5 w-5" aria-hidden />
              ) : (
                <Sun className="h-5 w-5" aria-hidden />
              )
            ) : (
              <Sun className="h-5 w-5 opacity-0" aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { THEME_STORAGE_KEY };

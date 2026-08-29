import { cn } from "@/lib/utils";
import type { GlassState, GlassVariant } from "@/lib/design-tokens";

export type GlassSurfaceOptions = {
  variant?: GlassVariant;
  state?: GlassState;
  className?: string;
};

/**
 * Returns class names for the liquid glass material system.
 * Glass belongs on the functional layer only — never nest glass inside glass.
 */
export function glassSurfaceClasses({
  variant = "regular",
  state = "default",
  className,
}: GlassSurfaceOptions = {}): string {
  return cn(
    "glass-surface",
    `glass-surface--${variant}`,
    state !== "default" && `glass-surface--${state}`,
    className,
  );
}

/**
 * Opaque elevated surface using glass color tokens — no backdrop-filter.
 * Use for list cards and controls inside glass shells to avoid stacked blur.
 */
export function surfaceElevatedClasses(className?: string): string {
  return cn("surface-elevated", className);
}

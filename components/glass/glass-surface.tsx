import * as React from "react";

import { glassSurfaceClasses } from "@/lib/glass";
import type { GlassState, GlassVariant } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type GlassSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: GlassVariant;
  state?: GlassState;
};

const GLASS_VARIANT_ROUNDED: Record<GlassVariant, string> = {
  regular: "rounded-surface",
  clear: "rounded-button",
  prominent: "rounded-sheet",
};

/**
 * Base liquid glass primitive. Use on the functional layer only — never nest
 * glass surfaces inside other glass surfaces.
 */
const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ variant = "regular", state = "default", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        glassSurfaceClasses({ variant, state }),
        GLASS_VARIANT_ROUNDED[variant],
        className,
      )}
      {...props}
    />
  ),
);
GlassSurface.displayName = "GlassSurface";

export { GlassSurface };

import * as React from "react";

import { glassSurfaceClasses } from "@/lib/glass";
import type { GlassState, GlassVariant } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type GlassSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: GlassVariant;
  state?: GlassState;
};

/**
 * Base liquid glass primitive. Use on the functional layer only — never nest
 * glass surfaces inside other glass surfaces.
 */
const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ variant = "regular", state = "default", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassSurfaceClasses({ variant, state }), className)}
      {...props}
    />
  ),
);
GlassSurface.displayName = "GlassSurface";

export { GlassSurface };

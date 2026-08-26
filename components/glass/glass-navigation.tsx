import * as React from "react";

import { glassSurfaceClasses } from "@/lib/glass";
import type { GlassVariant } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type GlassNavigationProps = React.HTMLAttributes<HTMLElement> & {
  variant?: GlassVariant;
};

/**
 * Navigation bar / floating header shell using glass regular material.
 */
const GlassNavigation = React.forwardRef<HTMLElement, GlassNavigationProps>(
  ({ variant = "regular", className, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn(
        glassSurfaceClasses({ variant }),
        "rounded-popover shadow-glass",
        className,
      )}
      {...props}
    />
  ),
);
GlassNavigation.displayName = "GlassNavigation";

export { GlassNavigation };

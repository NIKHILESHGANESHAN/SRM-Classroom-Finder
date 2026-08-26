import * as React from "react";

import { glassSurfaceClasses } from "@/lib/glass";
import type { GlassVariant } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type GlassPopoverProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: GlassVariant;
  open?: boolean;
};

/**
 * Floating menu / popover shell. Default variant: regular.
 * Apply on a single functional layer — do not wrap glass buttons inside.
 */
const GlassPopover = React.forwardRef<HTMLDivElement, GlassPopoverProps>(
  (
    { variant = "regular", open = true, className, children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role="presentation"
      className={cn(
        glassSurfaceClasses({
          variant,
          state: open ? "open" : "default",
        }),
        "rounded-popover p-1 shadow-glass",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
GlassPopover.displayName = "GlassPopover";

export { GlassPopover };

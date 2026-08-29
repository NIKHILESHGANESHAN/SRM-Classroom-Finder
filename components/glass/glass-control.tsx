import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { surfaceElevatedClasses, glassSurfaceClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

const glassControlVariants = cva(
  "inline-flex items-center justify-center transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        regular: glassSurfaceClasses({ variant: "regular" }),
        clear: glassSurfaceClasses({ variant: "clear" }),
        prominent: glassSurfaceClasses({ variant: "prominent" }),
        elevated: surfaceElevatedClasses(),
      },
      size: {
        default: "min-h-11 px-3 rounded-control text-sm",
        sm: "min-h-11 px-2.5 rounded-control text-xs",
        icon: "min-h-11 min-w-11 rounded-control",
      },
    },
    defaultVariants: {
      variant: "clear",
      size: "default",
    },
  },
);

export interface GlassControlProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassControlVariants> {
  active?: boolean;
  open?: boolean;
}

/**
 * Lightweight glass control for filters, toggles, and selected states.
 * Not a button primitive — add `btn-press` only when used as a pressable button.
 */
const GlassControl = React.forwardRef<HTMLButtonElement, GlassControlProps>(
  (
    { className, variant, size, active = false, open = false, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        glassControlVariants({ variant, size }),
        active && glassSurfaceClasses({ state: "active" }),
        open && glassSurfaceClasses({ state: "open" }),
        className,
      )}
      {...props}
    />
  ),
);
GlassControl.displayName = "GlassControl";

export { GlassControl, glassControlVariants };

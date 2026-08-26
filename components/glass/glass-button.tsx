import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { glassSurfaceClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "btn-press inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        regular: glassSurfaceClasses({ variant: "regular" }),
        clear: glassSurfaceClasses({ variant: "clear" }),
        prominent: glassSurfaceClasses({ variant: "prominent" }),
      },
      size: {
        default: "h-9 px-4 py-2 rounded-button",
        sm: "h-8 px-3 text-xs rounded-button",
        lg: "h-10 px-8 rounded-button",
        icon: "h-9 w-9 rounded-button",
      },
      tone: {
        default: "text-foreground hover:text-cf-accent",
        accent:
          "text-primary-foreground bg-primary/90 border-primary/20 hover:bg-primary",
      },
    },
    defaultVariants: {
      variant: "regular",
      size: "default",
      tone: "default",
    },
  },
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  /** Maps to glass active state styling */
  active?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant,
      size,
      tone,
      asChild = false,
      active = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          glassButtonVariants({ variant, size, tone }),
          active && glassSurfaceClasses({ state: "active" }),
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };

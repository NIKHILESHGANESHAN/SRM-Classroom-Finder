"use client";

import { ClassFinderLogo, type ClassFinderLogoSize } from "@/components/brand/classfinder-logo";
import { SoundLink } from "@/components/sound/sound-link";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ClassFinderBrandProps = {
  size?: ClassFinderLogoSize;
  title?: string;
  subtitle?: string;
  className?: string;
  logoClassName?: string;
};

/**
 * Logo + product label for navigation headers — links to the landing page.
 */
export function ClassFinderBrand({
  size = "nav",
  title = PRODUCT_NAME,
  subtitle,
  className,
  logoClassName,
}: ClassFinderBrandProps) {
  return (
    <SoundLink
      href="/"
      aria-label="ClassFinder home"
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-button transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <ClassFinderLogo size={size} className={logoClassName} priority={size === "hero"} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">
          <span className="text-cf-accent">{title}</span>
          {subtitle ? (
            <span className="font-medium text-muted-foreground"> · {subtitle}</span>
          ) : null}
        </p>
      </div>
    </SoundLink>
  );
}

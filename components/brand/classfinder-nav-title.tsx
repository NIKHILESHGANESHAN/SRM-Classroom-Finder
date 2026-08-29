"use client";

import { ClassFinderLogo } from "@/components/brand/classfinder-logo";
import { SoundLink } from "@/components/sound/sound-link";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ClassFinderNavTitleProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  /** When true, logo + title link to the landing page. Defaults to product branding. */
  linkHome?: boolean;
};

/**
 * Logo + page title block for in-app navigation headers.
 */
export function ClassFinderNavTitle({
  title = PRODUCT_NAME,
  subtitle,
  className,
  linkHome = title === PRODUCT_NAME,
}: ClassFinderNavTitleProps) {
  const titleClass =
    "truncate text-base font-semibold text-foreground sm:text-lg";
  const subtitleClass = "truncate text-xs text-muted-foreground";

  if (linkHome) {
    return (
      <SoundLink
        href="/"
        aria-label="ClassFinder home"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-button transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        <ClassFinderLogo size="nav" />
        <div className="min-w-0">
          <h1 className={titleClass}>{title}</h1>
          {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
        </div>
      </SoundLink>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)}>
      <ClassFinderLogo size="nav" />
      <div className="min-w-0">
        <h1 className={titleClass}>{title}</h1>
        {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
      </div>
    </div>
  );
}

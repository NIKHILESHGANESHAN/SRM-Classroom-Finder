import Link from "next/link";

import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from "@/lib/design-tokens";

/**
 * Landing page actions — primary Finder CTA, secondary Contributor link,
 * and tertiary navigation. Server Component; motion via CSS only.
 */
export function LandingActions() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-5 sm:gap-6">
        <Button
          asChild
          size="lg"
          className="h-12 w-full text-base shadow-token-sm transition-standard hover:bg-primary/90 sm:w-fit sm:min-w-[15rem]"
        >
          <Link href="/finder">Find a classroom</Link>
        </Button>

        <div className="border-l-2 border-cf-accent/30 pl-4 sm:max-w-sm sm:pl-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Found an empty room?
          </p>
          <Link
            href="/contribute"
            className="mt-1 inline-flex min-h-11 items-center text-base font-semibold text-cf-accent underline-offset-4 transition-standard hover:text-cf-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Report it
          </Link>
        </div>
      </div>

      <nav
        className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-6"
        aria-label="More on ClassFinder"
      >
        <Link
          href="/stats"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 transition-standard hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Stats
        </Link>
        <Link
          href="/how-it-works"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 transition-standard hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          How it works
        </Link>
      </nav>
    </div>
  );
}

export function LandingNav() {
  return (
    <header className="relative z-20 px-4 pt-3 sm:px-6 sm:pt-4">
      <GlassNavigation
        aria-label="ClassFinder"
        className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:max-w-2xl"
      >
        <p className="truncate text-sm font-medium text-foreground">
          <span className="text-cf-accent">{PRODUCT_NAME}</span>
          <span className="text-muted-foreground"> · SRM KTR</span>
        </p>
        <MoreOptionsMenu className="shrink-0" />
      </GlassNavigation>
    </header>
  );
}

export function LandingHero() {
  return (
    <header className="animate-fade-up space-y-4 motion-reduce:animate-none">
      <h1 className="type-display text-balance text-foreground">
        Need a classroom?
      </h1>
      <p className="type-body max-w-md text-pretty text-muted-foreground">
        {PRODUCT_DESCRIPTOR}
      </p>
      <p className="text-sm text-muted-foreground">
        UB · TP1 · TP2 · no login required
      </p>
    </header>
  );
}

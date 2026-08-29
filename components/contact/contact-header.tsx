"use client";

import { ArrowLeft } from "lucide-react";
import { GlassNavigation } from "@/components/glass";
import { ClassFinderNavTitle } from "@/components/brand/classfinder-nav-title";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { SoundLink } from "@/components/sound/sound-link";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/design-tokens";

type ContactHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showProductName?: boolean;
};

export function ContactHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back to home",
  showProductName = false,
}: ContactHeaderProps) {
  return (
    <GlassNavigation
      aria-label="Contact navigation"
      className="flex items-center gap-2 px-2 py-2 sm:px-3"
    >
      <Button
        variant="ghost"
        size="icon"
        className="btn-press min-h-11 min-w-11"
        asChild
      >
        <SoundLink href={backHref} aria-label={backLabel}>
          <ArrowLeft className="h-5 w-5" />
        </SoundLink>
      </Button>
      {showProductName ? (
        <ClassFinderNavTitle title={PRODUCT_NAME} subtitle={title} />
      ) : (
        <ClassFinderNavTitle title={title} subtitle={subtitle} />
      )}
      <MoreOptionsMenu className="shrink-0" />
    </GlassNavigation>
  );
}

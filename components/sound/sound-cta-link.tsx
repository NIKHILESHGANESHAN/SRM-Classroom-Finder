"use client";

import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/sound/sound-link";
import type { SoundType } from "@/lib/sound-effects";

type SoundCtaLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  sound?: SoundType;
};

export function SoundCtaLink({
  href,
  children,
  className,
  sound = "click",
}: SoundCtaLinkProps) {
  return (
    <Button asChild size="lg" className={className}>
      <SoundLink href={href} sound={sound}>
        {children}
      </SoundLink>
    </Button>
  );
}

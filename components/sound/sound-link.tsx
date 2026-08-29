"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useSound } from "@/components/sound/sound-provider";
import type { SoundType } from "@/lib/sound-effects";

export type SoundLinkProps = ComponentProps<typeof Link> & {
  sound?: SoundType;
};

/**
 * Next.js Link that plays a semantic UI sound on activation.
 */
export function SoundLink({
  sound = "click",
  onClick,
  ...props
}: SoundLinkProps) {
  const { play } = useSound();

  return (
    <Link
      {...props}
      onClick={(event) => {
        play(sound);
        onClick?.(event);
      }}
    />
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_PATH = "/brand/classfinder-logo-source.png";

const SIZE_MAP = {
  nav: 32,
  md: 48,
  hero: 80,
} as const;

export type ClassFinderLogoSize = keyof typeof SIZE_MAP;

type ClassFinderLogoProps = {
  size?: ClassFinderLogoSize;
  className?: string;
  priority?: boolean;
};

/**
 * Official ClassFinder mark — raster asset with intentional white background.
 */
export function ClassFinderLogo({
  size = "nav",
  className,
  priority = false,
}: ClassFinderLogoProps) {
  const px = SIZE_MAP[size];

  return (
    <Image
      src={LOGO_PATH}
      alt=""
      width={px}
      height={px}
      priority={priority}
      className={cn("shrink-0 rounded-control", className)}
      aria-hidden
    />
  );
}

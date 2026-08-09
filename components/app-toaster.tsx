"use client";

import { Toaster } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Sonner toaster — top-right on desktop, top-center on mobile (Section 7).
 * Swipeable + 3.5s auto-dismiss configured here.
 */
export function AppToaster() {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <Toaster
      position={isDesktop ? "top-right" : "top-center"}
      duration={3500}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}

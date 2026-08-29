"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { subscribeXoEasterEggOpen } from "@/lib/open-xo-easter-egg";

const LazyXoEasterEggDialog = dynamic(
  () =>
    import("@/components/easter-egg/xo-easter-egg-dialog").then((m) => ({
      default: m.XoEasterEggDialog,
    })),
  { ssr: false },
);

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin"));
}

/**
 * Global XO dialog — deferred mount + lazy chunk.
 * Opened via Easter Egg "Play XO" (see openXoEasterEgg).
 */
export function XoEasterEggDeferred() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [dialogLoaded, setDialogLoaded] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setMounted(true), {
        timeout: 3000,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(() => setMounted(true), 500);
    return () => window.clearTimeout(timerId);
  }, []);

  const openDialog = useCallback(() => {
    setDialogLoaded(true);
    setOpen(true);
  }, []);

  useEffect(() => subscribeXoEasterEggOpen(openDialog), [openDialog]);

  if (!mounted || isAdminPath(pathname)) return null;

  if (!dialogLoaded) return null;

  return <LazyXoEasterEggDialog open={open} onOpenChange={setOpen} />;
}

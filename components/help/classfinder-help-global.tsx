"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { glassSurfaceClasses } from "@/lib/glass";
import { HELP_FLOATING_WELCOME } from "@/lib/help/help-ui";
import { EASE_OUT_EXPO, MOTION_STANDARD } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LazyHelpChatPanel = dynamic(
  () =>
    import("@/components/help/help-chat-panel").then((m) => ({
      default: m.HelpChatPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-surface border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading Help…
      </div>
    ),
  },
);

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin"));
}

/**
 * Global ClassFinder Help — floating launcher + compact panel on public routes.
 * Lazy-loads the chat panel chunk on first open.
 */
export function ClassFinderHelpGlobal() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const composerId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);

  const handleClose = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const handleOpen = useCallback(() => {
    setPanelMounted(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const closeBtn = panelRef.current.querySelector<HTMLElement>(
      "[data-help-close]",
    );
    closeBtn?.focus();
  }, [open, panelMounted]);

  if (isAdminPath(pathname)) {
    return null;
  }

  return createPortal(
    <>
      <button
        ref={launcherRef}
        type="button"
        data-cf-help-launcher=""
        onClick={() => (open ? handleClose() : handleOpen())}
        aria-label={open ? "Close ClassFinder Help" : "Open ClassFinder Help"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "btn-press fixed z-[120] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-token-lg transition-standard motion-reduce:transition-none",
          "bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "sm:h-[3.75rem] sm:w-[3.75rem]",
        )}
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
      </button>

      {open && panelMounted ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="fixed inset-0 z-[119] bg-black/20 motion-reduce:transition-none [@media(prefers-reduced-transparency:reduce)]:bg-background/80"
            onClick={handleClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={cn(
              "fixed z-[120] flex w-[min(420px,calc(100vw-1.5rem))] flex-col",
              "bottom-[max(5.25rem,calc(4.75rem+env(safe-area-inset-bottom)))]",
              "right-[max(0.75rem,env(safe-area-inset-right))]",
              "max-sm:inset-x-3 max-sm:bottom-[max(5rem,calc(4.25rem+env(safe-area-inset-bottom)))] max-sm:w-auto max-sm:right-auto",
            )}
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
          >
            <div
              className={cn(
                glassSurfaceClasses({ variant: "regular" }),
                "mb-2 flex items-start justify-between gap-2 rounded-popover px-3 py-2.5 sm:px-4",
              )}
            >
              <div className="min-w-0 pr-1">
                <h2 id={titleId} className="text-sm font-semibold text-foreground">
                  ClassFinder Help
                </h2>
                <p id={descId} className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Ask about rooms, reports, or how ClassFinder works.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-help-close
                className="min-h-11 min-w-11 shrink-0"
                onClick={handleClose}
                aria-label="Close ClassFinder Help"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <Suspense
              fallback={
                <div className="rounded-surface border border-border bg-card p-4 text-sm text-muted-foreground">
                  Loading Help…
                </div>
              }
            >
              <LazyHelpChatPanel
                variant="floating"
                welcome={HELP_FLOATING_WELCOME}
                autoFocusInput
                composerId={composerId}
              />
            </Suspense>
          </motion.div>
        </>
      ) : null}
    </>,
    document.body,
  );
}

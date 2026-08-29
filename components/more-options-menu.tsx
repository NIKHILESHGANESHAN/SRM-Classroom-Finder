"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { GlassPopover } from "@/components/glass";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MoreOptionsMenuProps = {
  className?: string;
};

function isContactPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/contact"));
}

/**
 * Compact overflow menu (V2.5/V2.6). Keyboard + pointer; pathname-aware.
 */
export function MoreOptionsMenu({ className }: MoreOptionsMenuProps) {
  const pathname = usePathname();
  const onContact = isContactPath(pathname);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const itemRef = useRef<HTMLAnchorElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();
  const buttonId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    itemRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemHref = onContact ? "/" : "/contact";
  const itemLabel = onContact ? "Home" : "Contact us";

  return (
    <div ref={wrapRef} className={cn("relative isolate", className)}>
      <Button
        ref={buttonRef}
        type="button"
        id={buttonId}
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </Button>
      {open ? (
        <GlassPopover
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          open
          className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden motion-reduce:transition-none"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Link
            ref={itemRef}
            role="menuitem"
            href={itemHref}
            aria-current={onContact && itemHref === pathname ? "page" : undefined}
            className="flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-foreground outline-none transition-standard hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(false)}
          >
            {itemLabel}
          </Link>
        </GlassPopover>
      ) : null}
    </div>
  );
}

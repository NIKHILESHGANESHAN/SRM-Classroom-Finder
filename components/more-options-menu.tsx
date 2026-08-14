"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreVertical } from "lucide-react";
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
    <div ref={wrapRef} className={cn("relative", className)}>
      <Button
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
        <ul
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg motion-reduce:transition-none"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <li role="none">
            <Link
              ref={itemRef}
              role="menuitem"
              href={itemHref}
              aria-current={onContact && itemHref === pathname ? "page" : undefined}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen(false)}
            >
              {itemLabel}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

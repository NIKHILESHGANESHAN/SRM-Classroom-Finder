"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassNavigation } from "@/components/glass";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/operations", label: "Operations", exact: false },
  { href: "/admin/reports", label: "Reports", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <GlassNavigation
      aria-label="ClassFinder Admin"
      className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">
          ClassFinder · Admin
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Campus operations console
        </p>
      </div>
      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-1 sm:justify-end"
      >
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "btn-press inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "bg-cf-accent-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <AdminLogoutButton />
    </GlassNavigation>
  );
}

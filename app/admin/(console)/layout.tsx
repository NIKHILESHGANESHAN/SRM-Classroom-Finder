import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/session";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import Link from "next/link";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = isAdminAuthenticated();
  if (!allowed) {
    redirect("/admin/login");
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Private
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Admin
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Health
          </Link>
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Inventory
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reports
          </Link>
        </nav>
        <AdminLogoutButton />
      </header>
      {children}
    </div>
  );
}

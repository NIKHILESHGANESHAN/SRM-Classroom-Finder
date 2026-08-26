import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "ClassFinder Admin sign in.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  if (isAdminAuthenticated()) {
    redirect("/admin");
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">ClassFinder · Admin</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Private operations console. Sign in with the admin secret configured on
          the server.
        </p>
      </header>
      <div className="rounded-surface border border-border bg-card p-5 shadow-token-sm">
        <AdminLoginForm />
      </div>
    </div>
  );
}

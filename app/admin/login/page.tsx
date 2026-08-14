import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Admin sign in",
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
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Private
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Admin sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          This area is not part of the anonymous student app. Sign in with the
          private admin password configured on the server.
        </p>
      </header>
      <AdminLoginForm />
    </div>
  );
}

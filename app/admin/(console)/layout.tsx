import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/session";
import { AdminNav } from "@/components/admin/admin-nav";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-7">
      <AdminNav />
      {children}
    </div>
  );
}

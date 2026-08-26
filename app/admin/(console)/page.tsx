import {
  getAdminBuildingSummaries,
  getAdminHealth,
} from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  requireAdmin();
  const [health, buildings] = await Promise.all([
    getAdminHealth(),
    getAdminBuildingSummaries(),
  ]);

  return <AdminOverviewPanel health={health} buildings={buildings} />;
}

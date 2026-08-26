import {
  getAdminBuildingSummaries,
  getAdminInventory,
} from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { InventoryManager } from "@/components/admin/inventory-manager";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  requireAdmin();
  const [rows, buildings] = await Promise.all([
    getAdminInventory(),
    getAdminBuildingSummaries(),
  ]);

  return (
    <div className="space-y-4">
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Manage authoritative classroom inventory. Deactivate rooms to stop new
          reports — historical data is never deleted.
        </p>
      </header>
      <InventoryManager rows={rows} buildings={buildings} />
    </div>
  );
}

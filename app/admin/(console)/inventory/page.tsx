import { getAdminInventory } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { ClassroomActiveToggle } from "@/components/admin/classroom-active-toggle";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  requireAdmin();
  const rows = await getAdminInventory();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Activate or deactivate classrooms. Rooms not on the official inventory
        cannot be activated. Reports are never deleted.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3">Building</th>
              <th className="px-3 py-3">Floor</th>
              <th className="px-3 py-3">Room</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.classroomId} className="border-t border-border">
                <td className="px-3 py-2">{row.buildingCode}</td>
                <td className="px-3 py-2 tabular-nums">{row.floorNumber}</td>
                <td className="px-3 py-2">{row.roomNumber}</td>
                <td className="px-3 py-2">
                  {row.isActive ? "Active" : "Inactive"}
                  {!row.official ? " · unofficial" : ""}
                </td>
                <td className="px-3 py-2">
                  <ClassroomActiveToggle
                    classroomId={row.classroomId}
                    isActive={row.isActive}
                    canActivate={row.official}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

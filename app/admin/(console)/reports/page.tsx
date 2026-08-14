import { getAdminReports } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  requireAdmin();
  const rows = await getAdminReports();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Latest free reports. Contributor devices are shown as one-way
        fingerprints only — never raw tokens.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3">Room</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Confirms</th>
              <th className="px-3 py-3">Occupied</th>
              <th className="px-3 py-3">Events</th>
              <th className="px-3 py-3">Slot</th>
              <th className="px-3 py-3">Expires</th>
              <th className="px-3 py-3">Device</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={8}>
                  No reports in the database.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.freeReportId} className="border-t border-border">
                  <td className="px-3 py-2">
                    {row.buildingCode} {row.roomNumber}
                    <span className="block text-xs text-muted-foreground">
                      Floor {row.floorNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.confirmationCount}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.occupiedStrikes}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.eventCount}</td>
                  <td className="px-3 py-2 tabular-nums">{row.slotOrder}</td>
                  <td className="px-3 py-2 text-xs">{row.expiresAt}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.contributorFingerprint}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

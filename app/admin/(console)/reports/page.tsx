import { getAdminReports } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { ReportStatusBadge } from "@/components/admin/report-status-badge";

export const dynamic = "force-dynamic";

function formatIsoShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminReportsPage() {
  requireAdmin();
  const rows = await getAdminReports();

  return (
    <div className="space-y-4">
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Latest free reports. Device fingerprints are one-way hashes — never raw
          tokens.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-surface border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No reports in the database.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-surface border border-border bg-card shadow-token-sm lg:block">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">Recent free reports</caption>
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Room
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Confirms
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Occupied
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Events
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Slot
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Expires
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.freeReportId} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {row.buildingCode} {row.roomNumber}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Floor {row.floorNumber} · {row.reportDate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.confirmationCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.occupiedStrikes} / 2
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.eventCount}</td>
                    <td className="px-4 py-3 tabular-nums">{row.slotOrder}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {formatIsoShort(row.expiresAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.contributorFingerprint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <li
                key={row.freeReportId}
                className="rounded-surface border border-border bg-card p-4 shadow-token-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {row.buildingCode} {row.roomNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Floor {row.floorNumber} · Slot {row.slotOrder}
                    </p>
                  </div>
                  <ReportStatusBadge status={row.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Confirms</dt>
                    <dd className="tabular-nums">{row.confirmationCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Occupied</dt>
                    <dd className="tabular-nums">{row.occupiedStrikes} / 2</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Events</dt>
                    <dd className="tabular-nums">{row.eventCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Expires</dt>
                    <dd>{formatIsoShort(row.expiresAt)}</dd>
                  </div>
                </dl>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {row.contributorFingerprint}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

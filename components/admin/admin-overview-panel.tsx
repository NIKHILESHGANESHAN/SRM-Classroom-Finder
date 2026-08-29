import type { AdminBuildingSummary, AdminHealth } from "@/lib/admin/data";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </dd>
      {hint ? (
        <dd className="text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </div>
  );
}

export function AdminOverviewPanel({
  health,
  buildings,
}: {
  health: AdminHealth;
  buildings: AdminBuildingSummary[];
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Operational status from PostgreSQL. Campus time {health.campusTimeLabel}.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Reports</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Active reports" value={health.activeFreeReportCount} />
          <Metric
            label="Reports today"
            value={health.reportsToday}
            hint="Campus calendar day"
          />
          <Metric label="Hidden reports" value={health.hiddenReportCount} />
          <Metric label="Expired reports" value={health.expiredReportCount} />
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Inventory</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Metric label="Active classrooms" value={health.activeClassroomCount} />
          <Metric label="Inactive classrooms" value={health.inactiveClassroomCount} />
          <Metric label="Total classrooms" value={health.totalClassroomCount} />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Buildings</h2>
        <div className="overflow-x-auto rounded-surface border border-border bg-card shadow-token-sm">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <caption className="sr-only">Building inventory summary</caption>
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Building
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Floors
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Classrooms
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((building) => (
                <tr key={building.buildingId} className="border-t border-border/70">
                  <td className="px-4 py-3">
                    <span className="font-medium">{building.code}</span>
                    <span className="ml-2 text-muted-foreground">
                      {building.name}
                    </span>
                    {building.inventoryDeferred ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Inventory not yet added
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{building.floorCount}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {building.classroomCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {building.activeClassroomCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-base font-semibold text-foreground">System health</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Database</dt>
            <dd className="font-medium text-foreground">
              {health.databaseOk ? "Connected" : "Unavailable"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">App version</dt>
            <dd className="font-medium tabular-nums">{health.appVersion}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-border/60 pb-2 sm:col-span-2">
            <dt className="text-muted-foreground">Server time (campus IST)</dt>
            <dd className="font-medium text-foreground">{health.campusTimeLabel}</dd>
            <dd className="text-xs tabular-nums text-muted-foreground">
              UTC: {health.serverTimeIso}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Report expiry runs on a scheduled job about every five minutes.
        </p>
      </section>
    </div>
  );
}

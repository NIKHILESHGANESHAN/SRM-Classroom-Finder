import { HealthStatusBadge } from "@/components/admin/health-status-badge";
import { SoundLink } from "@/components/sound/sound-link";
import type {
  ActivityItem,
  AttentionItem,
  IntegrityIssue,
  OperationsCenterData,
  SystemHealthItem,
} from "@/lib/admin/operations";

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

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function activityKindLabel(kind: ActivityItem["kind"]): string {
  switch (kind) {
    case "report":
      return "Report";
    case "occupied":
      return "Strike";
    case "confirmation":
      return "Confirm";
    default:
      return "Event";
  }
}

function SystemHealthRow({ item }: { item: SystemHealthItem }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{item.label}</p>
        <p className="text-sm text-muted-foreground">{item.detail}</p>
      </div>
      <HealthStatusBadge status={item.status} />
    </div>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const content = (
  <>
      <p className="font-medium text-foreground">{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      {item.href ? (
        <p className="mt-2 text-xs font-medium text-foreground">
          View reports →
        </p>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <SoundLink
        href={item.href}
        className="block rounded-surface border border-border bg-card p-4 shadow-token-sm transition-standard hover:border-cf-accent/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </SoundLink>
    );
  }

  return (
    <div className="rounded-surface border border-border bg-card p-4 shadow-token-sm">
      {content}
    </div>
  );
}

function IntegrityIssueRow({ issue }: { issue: IntegrityIssue }) {
  return (
    <li className="border-b border-border/60 py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-foreground">{issue.title}</p>
        {issue.count !== undefined ? (
          <span className="tabular-nums text-sm text-muted-foreground">
            {issue.count}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
    </li>
  );
}

export function OperationsCenterPanel({ data }: { data: OperationsCenterData }) {
  const integrityHealthy = data.integrity.status === "healthy";

  return (
    <div className="space-y-8">
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">ClassFinder Operations Center</h1>
        <p className="text-sm text-muted-foreground">
          System health, operational signals, and catalog integrity. Campus time{" "}
          {data.campusTimeLabel}.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="ops-system-health">
        <h2 id="ops-system-health" className="text-base font-semibold text-foreground">
          System health
        </h2>
        <div className="rounded-surface border border-border bg-card p-4 shadow-token-sm sm:p-5">
          <div className="space-y-3">
            {data.systemHealth.map((item) => (
              <SystemHealthRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="ops-operational">
        <h2 id="ops-operational" className="text-base font-semibold text-foreground">
          Operational overview
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Active free reports"
            value={data.operational.activeFreeReports}
            hint="Unexpired, visible in Finder"
          />
          <Metric
            label="Reports today"
            value={data.operational.reportsToday}
            hint="Campus calendar day"
          />
          <Metric
            label="Unverified active"
            value={data.operational.unverifiedActive}
          />
          <Metric
            label="Confirmed active"
            value={data.operational.confirmedActive}
          />
        </dl>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Hidden reports" value={data.operational.hiddenReports} />
          <Metric label="Expired reports" value={data.operational.expiredReports} />
          <Metric
            label="Active classrooms"
            value={data.operational.activeClassrooms}
          />
          <Metric
            label="Inactive classrooms"
            value={data.operational.inactiveClassrooms}
          />
        </dl>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Metric label="Buildings" value={data.operational.buildingCount} />
          <Metric label="Floors" value={data.operational.floorCount} />
          <Metric label="Time slots" value={data.operational.timeSlotCount} />
        </dl>
      </section>

      <section className="space-y-4" aria-labelledby="ops-attention">
        <h2 id="ops-attention" className="text-base font-semibold text-foreground">
          Attention
        </h2>
        {data.attention.length === 0 ? (
          <p
            role="status"
            className="rounded-surface border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground"
          >
            No issues requiring attention
          </p>
        ) : (
          <ul className="space-y-3">
            {data.attention.map((item) => (
              <li key={item.id}>
                <AttentionCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="ops-integrity">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="ops-integrity"
            className="text-base font-semibold text-foreground"
          >
            Classroom data integrity
          </h2>
          <HealthStatusBadge status={data.integrity.status} />
        </div>
        {integrityHealthy ? (
          <p
            role="status"
            className="rounded-surface border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground"
          >
            Data integrity: Healthy — no catalog consistency problems detected.
          </p>
        ) : (
          <div className="rounded-surface border border-border bg-card p-4 shadow-token-sm sm:p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              {data.integrity.issueCount} issue
              {data.integrity.issueCount === 1 ? "" : "s"} require attention.
              This is a diagnostic summary — classroom records are not modified
              from this page.
            </p>
            <ul>
              {data.integrity.issues.map((issue) => (
                <IntegrityIssueRow key={issue.id} issue={issue} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="ops-activity">
        <h2 id="ops-activity" className="text-base font-semibold text-foreground">
          Recent activity
        </h2>
        <p className="text-sm text-muted-foreground">
          Derived from recent reports, occupied strikes, and confirmation events.
          No separate admin audit log exists in this version.
        </p>
        {data.recentActivity.length === 0 ? (
          <p className="rounded-surface border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No recent report activity in the database.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-surface border border-border bg-card shadow-token-sm">
            {data.recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {activityKindLabel(item.kind)}
                  </span>
                  <p className="text-sm text-foreground">{item.label}</p>
                </div>
                <time
                  className="shrink-0 text-xs tabular-nums text-muted-foreground"
                  dateTime={item.timestamp}
                >
                  {formatActivityTime(item.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="space-y-3 border-t border-border pt-6"
        aria-labelledby="ops-diagnostics"
      >
        <h2 id="ops-diagnostics" className="text-base font-semibold text-foreground">
          Quick diagnostics
        </h2>
        <p className="text-sm text-muted-foreground">
          Health and integrity checks above run on each page load. The report
          expiry job is scheduled about every five minutes via{" "}
          <code className="text-xs">/api/cron/expire</code>. Stale active reports
          indicate the job may be lagging.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">App version</dt>
            <dd className="font-medium tabular-nums">{data.appVersion}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Integrity summary</dt>
            <dd className="font-medium">
              {integrityHealthy
                ? "Healthy"
                : `${data.integrity.issueCount} issue(s)`}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

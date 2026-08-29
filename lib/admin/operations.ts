import { getAppVersion } from "@/lib/app-version";
import { getCatalogFinderBuildings, getCatalogTimeSlots } from "@/lib/catalog-cache";
import { isAnomalousReportExpiry } from "@/lib/admin/format-report-expiry";
import { prisma } from "@/lib/prisma";
import {
  activeFreeReportWhere,
  ACTIVE_FREE_REPORT_STATUSES,
} from "@/lib/report-integrity";
import { getCampusDateString } from "@/lib/slots";
import { isOfficialInventoryRoom } from "@/prisma/data/classroom-inventory";

export type HealthStatus = "healthy" | "warning" | "error" | "unknown";

export type SystemHealthItem = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type AttentionItem = {
  id: string;
  severity: "warning" | "error";
  title: string;
  description: string;
  href?: string;
};

export type IntegrityIssue = {
  id: string;
  severity: "warning" | "error";
  title: string;
  description: string;
  count?: number;
};

export type ActivityItem = {
  id: string;
  timestamp: string;
  kind: "report" | "occupied" | "confirmation";
  label: string;
};

export type OperationsOperationalMetrics = {
  activeFreeReports: number;
  reportsToday: number;
  unverifiedActive: number;
  confirmedActive: number;
  hiddenReports: number;
  expiredReports: number;
  activeClassrooms: number;
  inactiveClassrooms: number;
  totalClassrooms: number;
  buildingCount: number;
  floorCount: number;
  timeSlotCount: number;
};

export type OperationsCenterData = {
  campusTimeLabel: string;
  appVersion: string;
  systemHealth: SystemHealthItem[];
  operational: OperationsOperationalMetrics;
  attention: AttentionItem[];
  integrity: {
    status: HealthStatus;
    issueCount: number;
    issues: IntegrityIssue[];
  };
  recentActivity: ActivityItem[];
};

const STALE_REPORT_WARNING_THRESHOLD = 5;
const RECENT_ACTIVITY_LIMIT = 12;

function campusTimeLabel(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function emptyOperational(): OperationsOperationalMetrics {
  return {
    activeFreeReports: 0,
    reportsToday: 0,
    unverifiedActive: 0,
    confirmedActive: 0,
    hiddenReports: 0,
    expiredReports: 0,
    activeClassrooms: 0,
    inactiveClassrooms: 0,
    totalClassrooms: 0,
    buildingCount: 0,
    floorCount: 0,
    timeSlotCount: 0,
  };
}

function databaseUnavailablePayload(): OperationsCenterData {
  return {
    campusTimeLabel: campusTimeLabel(),
    appVersion: getAppVersion(),
    systemHealth: [
      {
        id: "database",
        label: "Database",
        status: "error",
        detail: "Connection unavailable",
      },
      {
        id: "finder",
        label: "Finder catalog",
        status: "unknown",
        detail: "Cannot verify without database",
      },
      {
        id: "cron",
        label: "Report expiry",
        status: "unknown",
        detail: "Cannot verify without database",
      },
      {
        id: "application",
        label: "Application",
        status: "healthy",
        detail: "Admin console responding",
      },
    ],
    operational: emptyOperational(),
    attention: [
      {
        id: "database-down",
        severity: "error",
        title: "Database unavailable",
        description:
          "Operational metrics and integrity checks cannot run until the database is reachable.",
      },
    ],
    integrity: { status: "unknown", issueCount: 0, issues: [] },
    recentActivity: [],
  };
}

function cronHealthStatus(staleCount: number): HealthStatus {
  if (staleCount === 0) return "healthy";
  if (staleCount >= STALE_REPORT_WARNING_THRESHOLD) return "warning";
  return "warning";
}

function cronHealthDetail(staleCount: number): string {
  if (staleCount === 0) {
    return "No past-due reports awaiting expiry";
  }
  return `${staleCount} report${staleCount === 1 ? "" : "s"} past expiry still marked active`;
}

function integritySummaryStatus(issues: IntegrityIssue[]): HealthStatus {
  if (issues.length === 0) return "healthy";
  if (issues.some((i) => i.severity === "error")) return "error";
  return "warning";
}

async function checkFinderCatalogHealth(): Promise<SystemHealthItem> {
  try {
    const [slots, buildings] = await Promise.all([
      getCatalogTimeSlots(),
      getCatalogFinderBuildings(),
    ]);
    if (slots.length === 0) {
      return {
        id: "finder",
        label: "Finder catalog",
        status: "warning",
        detail: "No time slots in catalog",
      };
    }
    if (buildings.length === 0) {
      return {
        id: "finder",
        label: "Finder catalog",
        status: "warning",
        detail: "No buildings in catalog",
      };
    }
    return {
      id: "finder",
      label: "Finder catalog",
      status: "healthy",
      detail: `${buildings.length} buildings, ${slots.length} time slots loaded`,
    };
  } catch {
    return {
      id: "finder",
      label: "Finder catalog",
      status: "error",
      detail: "Catalog query failed",
    };
  }
}

async function runCatalogIntegrityChecks(
  staleReportsCount: number,
): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  const [
    buildingsNoFloors,
    floorsNoClassrooms,
    activeClassrooms,
    recentReports,
    buildingsWithGaps,
  ] = await Promise.all([
    prisma.building.findMany({
      where: { floors: { none: {} } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.floor.findMany({
      where: { classrooms: { none: {} } },
      select: {
        floorNumber: true,
        building: { select: { code: true } },
      },
      orderBy: [{ building: { code: "asc" } }, { floorNumber: "asc" }],
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      select: {
        roomNumber: true,
        building: { select: { code: true } },
        floor: { select: { floorNumber: true } },
      },
    }),
    prisma.freeReport.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: { expiresAt: true, reportDate: true },
    }),
    prisma.building.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        _count: { select: { floors: true, classrooms: true } },
      },
    }),
  ]);

  if (buildingsNoFloors.length > 0) {
    const codes = buildingsNoFloors.map((b) => b.code).join(", ");
    issues.push({
      id: "buildings-no-floors",
      severity: "error",
      title: "Buildings without floors",
      description: `These buildings have no floor records: ${codes}.`,
      count: buildingsNoFloors.length,
    });
  }

  if (floorsNoClassrooms.length > 0) {
    const sample = floorsNoClassrooms
      .slice(0, 6)
      .map((f) => `${f.building.code} F${f.floorNumber}`)
      .join(", ");
    const suffix =
      floorsNoClassrooms.length > 6
        ? ` (+${floorsNoClassrooms.length - 6} more)`
        : "";
    issues.push({
      id: "floors-no-classrooms",
      severity: "warning",
      title: "Floors without classrooms",
      description: `${floorsNoClassrooms.length} floor(s) have no classroom records. Examples: ${sample}${suffix}.`,
      count: floorsNoClassrooms.length,
    });
  }

  const unofficialActive = activeClassrooms.filter(
    (c) =>
      !isOfficialInventoryRoom(
        c.building.code,
        c.floor.floorNumber,
        c.roomNumber,
      ),
  );
  if (unofficialActive.length > 0) {
    const sample = unofficialActive
      .slice(0, 4)
      .map((c) => `${c.building.code} ${c.roomNumber}`)
      .join(", ");
    const suffix =
      unofficialActive.length > 4
        ? ` (+${unofficialActive.length - 4} more)`
        : "";
    issues.push({
      id: "unofficial-active",
      severity: "warning",
      title: "Active classrooms outside official inventory",
      description: `${unofficialActive.length} active room(s) are not in the verified inventory file. Examples: ${sample}${suffix}.`,
      count: unofficialActive.length,
    });
  }

  if (staleReportsCount > 0) {
    issues.push({
      id: "stale-reports",
      severity:
        staleReportsCount >= STALE_REPORT_WARNING_THRESHOLD ? "error" : "warning",
      title: "Reports past expiry still active in database",
      description: `${staleReportsCount} report(s) are past expires_at but still marked unverified or confirmed. The expiry cron may be lagging.`,
      count: staleReportsCount,
    });
  }

  const anomalousCount = recentReports.filter((r) =>
    isAnomalousReportExpiry(
      r.expiresAt.toISOString(),
      r.reportDate.toISOString().slice(0, 10),
    ),
  ).length;
  if (anomalousCount > 0) {
    issues.push({
      id: "anomalous-expiry",
      severity: "warning",
      title: "Anomalous report expiry timestamps",
      description: `${anomalousCount} of the last 30 reports have expiry dates that look inconsistent with their report date.`,
      count: anomalousCount,
    });
  }

  const gapBuildings = buildingsWithGaps.filter(
    (b) => b._count.floors > 0 && b._count.classrooms === 0,
  );
  for (const building of gapBuildings) {
    issues.push({
      id: `inventory-gap-${building.code}`,
      severity: "warning",
      title: `${building.code} has floors but no classrooms`,
      description: `${building.code} has ${building._count.floors} floor(s) seeded but zero classroom records — Finder will show an inventory gap for this building.`,
      count: building._count.floors,
    });
  }

  return issues;
}

function buildAttentionItems(
  staleReportsCount: number,
  hiddenReports: number,
  integrityIssues: IntegrityIssue[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (staleReportsCount > 0) {
    items.push({
      id: "stale-reports",
      severity:
        staleReportsCount >= STALE_REPORT_WARNING_THRESHOLD ? "error" : "warning",
      title: "Reports awaiting expiry processing",
      description: `${staleReportsCount} report(s) are past their expiry time but still marked active. Verify the scheduled expiry job is running.`,
      href: "/admin/reports",
    });
  }

  if (hiddenReports > 0) {
    items.push({
      id: "hidden-reports",
      severity: "warning",
      title: "Hidden reports in database",
      description: `${hiddenReports} report(s) were hidden after occupied strikes. Review if any need follow-up.`,
      href: "/admin/reports",
    });
  }

  for (const issue of integrityIssues) {
    if (issue.id === "stale-reports") continue;
    items.push({
      id: `integrity-${issue.id}`,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      href:
        issue.id.startsWith("inventory-gap") || issue.id === "floors-no-classrooms"
          ? undefined
          : issue.id === "anomalous-expiry"
            ? "/admin/reports"
            : undefined,
    });
  }

  return items;
}

async function loadRecentActivity(): Promise<ActivityItem[]> {
  const [reports, occupied, events] = await Promise.all([
    prisma.freeReport.findMany({
      take: RECENT_ACTIVITY_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        classroom: {
          select: {
            roomNumber: true,
            building: { select: { code: true } },
            floor: { select: { floorNumber: true } },
          },
        },
        timeSlot: { select: { slotOrder: true } },
      },
    }),
    prisma.occupiedReport.findMany({
      take: RECENT_ACTIVITY_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        freeReport: {
          select: {
            classroom: {
              select: {
                roomNumber: true,
                building: { select: { code: true } },
              },
            },
            timeSlot: { select: { slotOrder: true } },
          },
        },
      },
    }),
    prisma.reportEvent.findMany({
      take: RECENT_ACTIVITY_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        freeReport: {
          select: {
            classroom: {
              select: {
                roomNumber: true,
                building: { select: { code: true } },
              },
            },
            timeSlot: { select: { slotOrder: true } },
          },
        },
      },
    }),
  ]);

  const timeline: ActivityItem[] = [];

  for (const row of reports) {
    const room = `${row.classroom.building.code} ${row.classroom.roomNumber}`;
    timeline.push({
      id: `report-${row.id}`,
      timestamp: row.createdAt.toISOString(),
      kind: "report",
      label: `Free report submitted — ${room}, slot ${row.timeSlot.slotOrder} (${row.status})`,
    });
  }

  for (const row of occupied) {
    const room = `${row.freeReport.classroom.building.code} ${row.freeReport.classroom.roomNumber}`;
    timeline.push({
      id: `occupied-${row.id}`,
      timestamp: row.createdAt.toISOString(),
      kind: "occupied",
      label: `Occupied strike — ${room}, slot ${row.freeReport.timeSlot.slotOrder} (${row.reason})`,
    });
  }

  for (const row of events) {
    const room = `${row.freeReport.classroom.building.code} ${row.freeReport.classroom.roomNumber}`;
    const verb =
      row.eventType === "still_free" ? "Still free tap" : "Confirmation";
    timeline.push({
      id: `event-${row.id}`,
      timestamp: row.createdAt.toISOString(),
      kind: "confirmation",
      label: `${verb} — ${room}, slot ${row.freeReport.timeSlot.slotOrder}`,
    });
  }

  timeline.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return timeline.slice(0, RECENT_ACTIVITY_LIMIT);
}

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const now = new Date();
  const campusToday = getCampusDateString();
  const [year, month, day] = campusToday.split("-").map(Number);
  const campusDate = new Date(Date.UTC(year, month - 1, day));

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return databaseUnavailablePayload();
  }

  const activeWhere = activeFreeReportWhere(now);

  const [
    activeFreeReports,
    reportsToday,
    hiddenReports,
    expiredReports,
    unverifiedActive,
    confirmedActive,
    activeClassrooms,
    inactiveClassrooms,
    totalClassrooms,
    buildingCount,
    floorCount,
    timeSlotCount,
    staleReportsCount,
    finderHealth,
    recentActivity,
  ] = await Promise.all([
    prisma.freeReport.count({ where: activeWhere }),
    prisma.freeReport.count({ where: { reportDate: campusDate } }),
    prisma.freeReport.count({ where: { status: "hidden" } }),
    prisma.freeReport.count({ where: { status: "expired" } }),
    prisma.freeReport.count({
      where: { ...activeWhere, status: "unverified" },
    }),
    prisma.freeReport.count({
      where: { ...activeWhere, status: "confirmed" },
    }),
    prisma.classroom.count({ where: { isActive: true } }),
    prisma.classroom.count({ where: { isActive: false } }),
    prisma.classroom.count(),
    prisma.building.count(),
    prisma.floor.count(),
    prisma.timeSlot.count(),
    prisma.freeReport.count({
      where: {
        status: { in: [...ACTIVE_FREE_REPORT_STATUSES] },
        expiresAt: { lt: now },
      },
    }),
    checkFinderCatalogHealth(),
    loadRecentActivity(),
  ]);

  const integrityIssues = await runCatalogIntegrityChecks(staleReportsCount);

  const systemHealth: SystemHealthItem[] = [
    {
      id: "database",
      label: "Database",
      status: "healthy",
      detail: "PostgreSQL connection OK",
    },
    finderHealth,
    {
      id: "cron",
      label: "Report expiry",
      status: cronHealthStatus(staleReportsCount),
      detail: cronHealthDetail(staleReportsCount),
    },
    {
      id: "application",
      label: "Application",
      status: "healthy",
      detail: `ClassFinder v${getAppVersion()} responding`,
    },
  ];

  const attention = buildAttentionItems(
    staleReportsCount,
    hiddenReports,
    integrityIssues,
  );

  return {
    campusTimeLabel: campusTimeLabel(),
    appVersion: getAppVersion(),
    systemHealth,
    operational: {
      activeFreeReports,
      reportsToday,
      unverifiedActive,
      confirmedActive,
      hiddenReports,
      expiredReports,
      activeClassrooms,
      inactiveClassrooms,
      totalClassrooms,
      buildingCount,
      floorCount,
      timeSlotCount,
    },
    attention,
    integrity: {
      status: integritySummaryStatus(integrityIssues),
      issueCount: integrityIssues.length,
      issues: integrityIssues,
    },
    recentActivity,
  };
}

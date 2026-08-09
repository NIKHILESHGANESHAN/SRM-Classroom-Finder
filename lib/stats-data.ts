/**
 * Stats page aggregates (Phase 10) — all via prisma.$queryRaw.
 *
 * Coursework showcase: GROUP BY, COUNT, AVG, HAVING, ORDER BY, LIMIT,
 * LEFT JOIN, FILTER (conditional aggregates), and week-range WHERE.
 * SQL stays visible in source for viva / DBMS evaluation.
 */

import { prisma } from "@/lib/prisma";
import {
  formatSlotRangeLabel,
  getCampusDateString,
  getCampusWeekStartString,
  timeToMinutes,
} from "@/lib/slots";

export type BusiestBuilding = {
  buildingId: string;
  code: string;
  name: string;
  reportCount: number;
} | null;

export type MostActiveSlot = {
  timeSlotId: string;
  slotOrder: number;
  rangeLabel: string;
  reportCount: number;
} | null;

export type ReportTotals = {
  today: number;
  thisWeek: number;
};

export type BuildingReportBar = {
  buildingId: string;
  code: string;
  name: string;
  reportCount: number;
};

export type StatusBreakdown = {
  status: string;
  reportCount: number;
};

export type TopClassroom = {
  classroomId: string;
  roomNumber: string;
  buildingCode: string;
  floorNumber: number;
  reportCount: number;
};

export type StatsPageData = {
  campusToday: string;
  weekStart: string;
  busiestBuildingToday: BusiestBuilding;
  mostActiveSlotThisWeek: MostActiveSlot;
  totals: ReportTotals;
  reportsPerBuilding: BuildingReportBar[];
  avgConfirmationsThisWeek: number | null;
  statusBreakdownThisWeek: StatusBreakdown[];
  topClassroomsThisWeek: TopClassroom[];
  hasAnyData: boolean;
};

type CountRow = { report_count: bigint | number };
type BuildingAggRow = {
  building_id: string;
  code: string;
  name: string;
  report_count: bigint | number;
};
type SlotAggRow = {
  time_slot_id: string;
  slot_order: number;
  start_time: Date | string;
  end_time: Date | string;
  report_count: bigint | number;
};
type TotalsRow = {
  today_count: bigint | number;
  week_count: bigint | number;
};
type AvgRow = { avg_confirmations: number | string | null };
type StatusRow = { status: string; report_count: bigint | number };
type TopRoomRow = {
  classroom_id: string;
  room_number: string;
  building_code: string;
  floor_number: number;
  report_count: bigint | number;
};

function n(value: bigint | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

/**
 * Busiest building today.
 * SQL concepts: JOIN, GROUP BY, COUNT(*), ORDER BY DESC, LIMIT 1
 */
async function queryBusiestBuildingToday(
  todayYmd: string,
): Promise<BusiestBuilding> {
  // GROUP BY collapses free_reports into one row per building.
  // COUNT(*) is the aggregate; ORDER BY + LIMIT 1 picks the mode (busiest).
  const rows = await prisma.$queryRaw<BuildingAggRow[]>`
    SELECT
      b.id AS building_id,
      b.code,
      b.name,
      COUNT(*)::int AS report_count
    FROM free_reports fr
    INNER JOIN classrooms c ON c.id = fr.classroom_id
    INNER JOIN buildings b ON b.id = c.building_id
    WHERE fr.report_date = CAST(${todayYmd} AS DATE)
    GROUP BY b.id, b.code, b.name
    ORDER BY report_count DESC, b.code ASC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    buildingId: row.building_id,
    code: row.code,
    name: row.name,
    reportCount: n(row.report_count),
  };
}

/**
 * Most active time slot this week (Mon–today, campus calendar).
 * SQL concepts: JOIN, WHERE range, GROUP BY, COUNT(*), ORDER BY, LIMIT
 */
async function queryMostActiveSlotThisWeek(
  weekStartYmd: string,
  todayYmd: string,
): Promise<MostActiveSlot> {
  const rows = await prisma.$queryRaw<SlotAggRow[]>`
    SELECT
      ts.id AS time_slot_id,
      ts.slot_order,
      ts.start_time,
      ts.end_time,
      COUNT(*)::int AS report_count
    FROM free_reports fr
    INNER JOIN time_slots ts ON ts.id = fr.time_slot_id
    WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
      AND fr.report_date <= CAST(${todayYmd} AS DATE)
    GROUP BY ts.id, ts.slot_order, ts.start_time, ts.end_time
    ORDER BY report_count DESC, ts.slot_order ASC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  const startMinutes = timeToMinutes(row.start_time);
  const endMinutes = timeToMinutes(row.end_time);
  return {
    timeSlotId: row.time_slot_id,
    slotOrder: row.slot_order,
    rangeLabel: formatSlotRangeLabel(startMinutes, endMinutes),
    reportCount: n(row.report_count),
  };
}

/**
 * Totals today + this week in one scan.
 * SQL concepts: COUNT(*) FILTER (WHERE …) — conditional aggregates
 */
async function queryReportTotals(
  weekStartYmd: string,
  todayYmd: string,
): Promise<ReportTotals> {
  const rows = await prisma.$queryRaw<TotalsRow[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE fr.report_date = CAST(${todayYmd} AS DATE)
      )::int AS today_count,
      COUNT(*) FILTER (
        WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
          AND fr.report_date <= CAST(${todayYmd} AS DATE)
      )::int AS week_count
    FROM free_reports fr
    WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
      AND fr.report_date <= CAST(${todayYmd} AS DATE)
  `;

  const row = rows[0];
  return {
    today: n(row?.today_count),
    thisWeek: n(row?.week_count),
  };
}

/**
 * Reports per building this week (includes zero-count buildings for the chart).
 * SQL concepts: LEFT JOIN + GROUP BY + COUNT(fr.id) (NULL-safe), ORDER BY
 */
async function queryReportsPerBuildingThisWeek(
  weekStartYmd: string,
  todayYmd: string,
): Promise<BuildingReportBar[]> {
  const rows = await prisma.$queryRaw<BuildingAggRow[]>`
    SELECT
      b.id AS building_id,
      b.code,
      b.name,
      COUNT(fr.id)::int AS report_count
    FROM buildings b
    LEFT JOIN classrooms c ON c.building_id = b.id
    LEFT JOIN free_reports fr
      ON fr.classroom_id = c.id
     AND fr.report_date >= CAST(${weekStartYmd} AS DATE)
     AND fr.report_date <= CAST(${todayYmd} AS DATE)
    GROUP BY b.id, b.code, b.name
    ORDER BY b.code ASC
  `;

  return rows.map((row) => ({
    buildingId: row.building_id,
    code: row.code,
    name: row.name,
    reportCount: n(row.report_count),
  }));
}

/**
 * Average confirmation_count this week.
 * SQL concepts: AVG() aggregate function
 */
async function queryAvgConfirmationsThisWeek(
  weekStartYmd: string,
  todayYmd: string,
): Promise<number | null> {
  const rows = await prisma.$queryRaw<AvgRow[]>`
    SELECT AVG(fr.confirmation_count)::float AS avg_confirmations
    FROM free_reports fr
    WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
      AND fr.report_date <= CAST(${todayYmd} AS DATE)
  `;
  const raw = rows[0]?.avg_confirmations;
  if (raw === null || raw === undefined) return null;
  return Math.round(n(raw) * 10) / 10;
}

/**
 * Status mix this week (confirmed / hidden / expired / unverified).
 * SQL concepts: GROUP BY status, COUNT(*)
 */
async function queryStatusBreakdownThisWeek(
  weekStartYmd: string,
  todayYmd: string,
): Promise<StatusBreakdown[]> {
  const rows = await prisma.$queryRaw<StatusRow[]>`
    SELECT
      fr.status::text AS status,
      COUNT(*)::int AS report_count
    FROM free_reports fr
    WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
      AND fr.report_date <= CAST(${todayYmd} AS DATE)
    GROUP BY fr.status
    ORDER BY report_count DESC
  `;

  return rows.map((row) => ({
    status: row.status,
    reportCount: n(row.report_count),
  }));
}

/**
 * Top classrooms this week that were reported more than once.
 * SQL concepts: GROUP BY multi-column, HAVING COUNT(*) >= 2, ORDER BY, LIMIT
 */
async function queryTopClassroomsThisWeek(
  weekStartYmd: string,
  todayYmd: string,
): Promise<TopClassroom[]> {
  // HAVING filters groups after aggregation — rooms with only one report drop out.
  const rows = await prisma.$queryRaw<TopRoomRow[]>`
    SELECT
      c.id AS classroom_id,
      c.room_number,
      b.code AS building_code,
      f.floor_number,
      COUNT(*)::int AS report_count
    FROM free_reports fr
    INNER JOIN classrooms c ON c.id = fr.classroom_id
    INNER JOIN buildings b ON b.id = c.building_id
    INNER JOIN floors f ON f.id = c.floor_id
    WHERE fr.report_date >= CAST(${weekStartYmd} AS DATE)
      AND fr.report_date <= CAST(${todayYmd} AS DATE)
    GROUP BY c.id, c.room_number, b.code, f.floor_number
    HAVING COUNT(*) >= 2
    ORDER BY report_count DESC, b.code ASC, c.room_number ASC
    LIMIT 5
  `;

  return rows.map((row) => ({
    classroomId: row.classroom_id,
    roomNumber: row.room_number,
    buildingCode: row.building_code,
    floorNumber: row.floor_number,
    reportCount: n(row.report_count),
  }));
}

/** Load all Stats dashboard aggregates in parallel. */
export async function getStatsPageData(): Promise<StatsPageData> {
  const campusToday = getCampusDateString();
  const weekStart = getCampusWeekStartString();

  const [
    busiestBuildingToday,
    mostActiveSlotThisWeek,
    totals,
    reportsPerBuilding,
    avgConfirmationsThisWeek,
    statusBreakdownThisWeek,
    topClassroomsThisWeek,
  ] = await Promise.all([
    queryBusiestBuildingToday(campusToday),
    queryMostActiveSlotThisWeek(weekStart, campusToday),
    queryReportTotals(weekStart, campusToday),
    queryReportsPerBuildingThisWeek(weekStart, campusToday),
    queryAvgConfirmationsThisWeek(weekStart, campusToday),
    queryStatusBreakdownThisWeek(weekStart, campusToday),
    queryTopClassroomsThisWeek(weekStart, campusToday),
  ]);

  return {
    campusToday,
    weekStart,
    busiestBuildingToday,
    mostActiveSlotThisWeek,
    totals,
    reportsPerBuilding,
    avgConfirmationsThisWeek,
    statusBreakdownThisWeek,
    topClassroomsThisWeek,
    hasAnyData: totals.thisWeek > 0 || totals.today > 0,
  };
}

/** Exported for smoke tests — busiest building row count shape. */
export async function __testCountReportsToday(): Promise<number> {
  const today = getCampusDateString();
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::int AS report_count
    FROM free_reports fr
    WHERE fr.report_date = CAST(${today} AS DATE)
  `;
  return n(rows[0]?.report_count);
}

import { prisma } from "@/lib/prisma";
import {
  formatSlotRangeLabel,
  getCurrentSlotId,
  getNowMinutesInTz,
  timeToMinutes,
  type SlotTimeFields,
} from "@/lib/slots";

/**
 * Row shape from the `active_free_classrooms` SQL VIEW.
 * Finder reads this view (not ad-hoc joins) — DBMS coursework artifact.
 */
export type ActiveFreeClassroom = {
  freeReportId: string;
  status: "unverified" | "confirmed" | "hidden" | "expired";
  confirmationCount: number;
  reportDate: string;
  expiresAt: string; // ISO-ish timestamp for client countdown
  classroomId: string;
  roomNumber: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  floorId: string;
  floorNumber: number;
  timeSlotId: string;
  slotOrder: number;
  startMinutes: number;
  endMinutes: number;
  slotRangeLabel: string;
};

export type FinderBuilding = {
  id: string;
  code: string;
  name: string;
  floors: { id: string; floorNumber: number }[];
};

export type FinderSlot = {
  id: string;
  slotOrder: number;
  rangeLabel: string;
  startMinutes: number;
  endMinutes: number;
};

export type FinderFilters = {
  buildingId?: string | null;
  floorId?: string | null;
  timeSlotId?: string | null;
};

export type FinderCoverageKind =
  | "none_free"
  | "insufficient_reports"
  | "inventory_gap";

export type FinderCoverage = {
  activeClassroomCount: number;
  historicalReportCount: number;
  kind: FinderCoverageKind;
};

export type FinderPageData = {
  rooms: ActiveFreeClassroom[];
  buildings: FinderBuilding[];
  timeSlots: FinderSlot[];
  currentSlotId: string | null;
  applied: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
  };
  coverage: FinderCoverage;
};

type ViewRow = {
  free_report_id: string;
  status: ActiveFreeClassroom["status"];
  confirmation_count: number;
  report_date: Date;
  expires_at: Date;
  classroom_id: string;
  room_number: string;
  building_id: string;
  building_code: string;
  building_name: string;
  floor_id: string;
  floor_number: number;
  time_slot_id: string;
  slot_order: number;
  start_time: Date | string;
  end_time: Date | string;
};

function mapViewRow(row: ViewRow): ActiveFreeClassroom {
  const startMinutes = timeToMinutes(row.start_time);
  const endMinutes = timeToMinutes(row.end_time);
  return {
    freeReportId: row.free_report_id,
    status: row.status,
    confirmationCount: row.confirmation_count,
    reportDate:
      row.report_date instanceof Date
        ? row.report_date.toISOString().slice(0, 10)
        : String(row.report_date).slice(0, 10),
    expiresAt:
      row.expires_at instanceof Date
        ? row.expires_at.toISOString()
        : new Date(row.expires_at).toISOString(),
    classroomId: row.classroom_id,
    roomNumber: row.room_number,
    buildingId: row.building_id,
    buildingCode: row.building_code,
    buildingName: row.building_name,
    floorId: row.floor_id,
    floorNumber: row.floor_number,
    timeSlotId: row.time_slot_id,
    slotOrder: row.slot_order,
    startMinutes,
    endMinutes,
    slotRangeLabel: formatSlotRangeLabel(startMinutes, endMinutes),
  };
}

/**
 * Query the `active_free_classrooms` VIEW with optional filters.
 * Sorted by building → floor → room (Finder default sort).
 */
export async function queryActiveFreeClassrooms(
  filters: FinderFilters,
): Promise<ActiveFreeClassroom[]> {
  const buildingId = filters.buildingId ?? null;
  const floorId = filters.floorId ?? null;
  const timeSlotId = filters.timeSlotId ?? null;

  // DBMS: SELECT from VIEW + parameterized WHERE (no string concat)
  const rows = await prisma.$queryRaw<ViewRow[]>`
    SELECT
      free_report_id,
      status,
      confirmation_count,
      report_date,
      expires_at,
      classroom_id,
      room_number,
      building_id,
      building_code,
      building_name,
      floor_id,
      floor_number,
      time_slot_id,
      slot_order,
      start_time,
      end_time
    FROM active_free_classrooms
    WHERE
      (${buildingId}::text IS NULL OR building_id = ${buildingId})
      AND (${floorId}::text IS NULL OR floor_id = ${floorId})
      AND (${timeSlotId}::text IS NULL OR time_slot_id = ${timeSlotId})
    ORDER BY building_code ASC, floor_number ASC, room_number ASC
  `;

  return rows.map(mapViewRow);
}

function coverageKind(
  activeClassroomCount: number,
  historicalReportCount: number,
): FinderCoverageKind {
  if (activeClassroomCount === 0) return "inventory_gap";
  if (historicalReportCount === 0) return "insufficient_reports";
  return "none_free";
}

/** Inventory vs report history for honest empty states (V2.1). */
export async function queryFinderCoverage(
  filters: FinderFilters,
): Promise<FinderCoverage> {
  const buildingId = filters.buildingId ?? null;
  const floorId = filters.floorId ?? null;
  const timeSlotId = filters.timeSlotId ?? null;

  const [classroomRows, reportRows] = await Promise.all([
    prisma.$queryRaw<[{ n: bigint | number }]>`
      SELECT COUNT(*)::int AS n
      FROM classrooms c
      WHERE c.is_active = TRUE
        AND (${buildingId}::text IS NULL OR c.building_id = ${buildingId})
        AND (${floorId}::text IS NULL OR c.floor_id = ${floorId})
    `,
    prisma.$queryRaw<[{ n: bigint | number }]>`
      SELECT COUNT(*)::int AS n
      FROM free_reports fr
      INNER JOIN classrooms c ON c.id = fr.classroom_id
      WHERE c.is_active = TRUE
        AND (${buildingId}::text IS NULL OR c.building_id = ${buildingId})
        AND (${floorId}::text IS NULL OR c.floor_id = ${floorId})
        AND (${timeSlotId}::text IS NULL OR fr.time_slot_id = ${timeSlotId})
    `,
  ]);

  const activeClassroomCount = Number(classroomRows[0]?.n ?? 0);
  const historicalReportCount = Number(reportRows[0]?.n ?? 0);

  return {
    activeClassroomCount,
    historicalReportCount,
    kind: coverageKind(activeClassroomCount, historicalReportCount),
  };
}

export async function getFinderPageData(
  filters: FinderFilters = {},
): Promise<FinderPageData> {
  const [buildings, slots] = await Promise.all([
    prisma.building.findMany({
      orderBy: { code: "asc" },
      include: {
        floors: {
          orderBy: { floorNumber: "asc" },
          select: { id: true, floorNumber: true },
        },
      },
    }),
    prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } }),
  ]);

  const slotFields: SlotTimeFields[] = slots.map((s) => ({
    id: s.id,
    slotOrder: s.slotOrder,
    startMinutes: timeToMinutes(s.startTime),
    endMinutes: timeToMinutes(s.endTime),
  }));

  const currentSlotId = getCurrentSlotId(slotFields, getNowMinutesInTz());

  // Default = "Free Right Now" (current slot). Explicit empty string means All.
  const timeSlotId =
    filters.timeSlotId === undefined
      ? currentSlotId
      : filters.timeSlotId === "" || filters.timeSlotId === "all"
        ? null
        : filters.timeSlotId;

  const buildingId =
    !filters.buildingId || filters.buildingId === "all"
      ? null
      : filters.buildingId;

  let floorId =
    !filters.floorId || filters.floorId === "all" ? null : filters.floorId;

  // Dependent floor: ignore floor filter if it doesn't belong to selected building
  if (buildingId && floorId) {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building?.floors.some((f) => f.id === floorId)) {
      floorId = null;
    }
  }
  if (!buildingId) {
    floorId = null;
  }

  const [rooms, coverage] = await Promise.all([
    queryActiveFreeClassrooms({
      buildingId,
      floorId,
      timeSlotId,
    }),
    queryFinderCoverage({
      buildingId,
      floorId,
      timeSlotId,
    }),
  ]);

  return {
    rooms,
    buildings: buildings.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      floors: b.floors,
    })),
    timeSlots: slotFields.map((s) => ({
      id: s.id,
      slotOrder: s.slotOrder,
      startMinutes: s.startMinutes,
      endMinutes: s.endMinutes,
      rangeLabel: formatSlotRangeLabel(s.startMinutes, s.endMinutes),
    })),
    currentSlotId,
    applied: {
      buildingId,
      floorId,
      timeSlotId,
    },
    coverage,
  };
}

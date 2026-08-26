import { formatTokenFingerprint } from "@/lib/admin/fingerprint";
import { isOfficialInventoryRoom } from "@/prisma/data/classroom-inventory";
import { prisma } from "@/lib/prisma";
import { getCampusDateString } from "@/lib/slots";

export type AdminHealth = {
  databaseOk: boolean;
  serverTimeIso: string;
  campusTimeLabel: string;
  appVersion: string;
  activeClassroomCount: number;
  inactiveClassroomCount: number;
  totalClassroomCount: number;
  activeFreeReportCount: number;
  reportsToday: number;
  expiredReportCount: number;
  hiddenReportCount: number;
};

export type AdminBuildingSummary = {
  buildingId: string;
  code: string;
  name: string;
  floorCount: number;
  classroomCount: number;
  activeClassroomCount: number;
  inventoryDeferred: boolean;
};

export async function getAdminHealth(): Promise<AdminHealth> {
  const serverTimeIso = new Date().toISOString();
  const campusTimeLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const campusToday = getCampusDateString();

  let databaseOk = false;
  let activeClassroomCount = 0;
  let inactiveClassroomCount = 0;
  let totalClassroomCount = 0;
  let activeFreeReportCount = 0;
  let reportsToday = 0;
  let expiredReportCount = 0;
  let hiddenReportCount = 0;

  const [year, month, day] = campusToday.split("-").map(Number);
  const campusDate = new Date(Date.UTC(year, month - 1, day));

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
    const [
      activeClass,
      inactiveClass,
      totalClass,
      activeFree,
      todayReports,
      expired,
      hidden,
    ] = await Promise.all([
      prisma.classroom.count({ where: { isActive: true } }),
      prisma.classroom.count({ where: { isActive: false } }),
      prisma.classroom.count(),
      prisma.freeReport.count({
        where: { status: { in: ["unverified", "confirmed"] } },
      }),
      prisma.freeReport.count({
        where: { reportDate: campusDate },
      }),
      prisma.freeReport.count({ where: { status: "expired" } }),
      prisma.freeReport.count({ where: { status: "hidden" } }),
    ]);
    activeClassroomCount = activeClass;
    inactiveClassroomCount = inactiveClass;
    totalClassroomCount = totalClass;
    activeFreeReportCount = activeFree;
    reportsToday = todayReports;
    expiredReportCount = expired;
    hiddenReportCount = hidden;
  } catch {
    databaseOk = false;
  }

  return {
    databaseOk,
    serverTimeIso,
    campusTimeLabel,
    appVersion: "0.1.0",
    activeClassroomCount,
    inactiveClassroomCount,
    totalClassroomCount,
    activeFreeReportCount,
    reportsToday,
    expiredReportCount,
    hiddenReportCount,
  };
}

export async function getAdminBuildingSummaries(): Promise<AdminBuildingSummary[]> {
  const buildings = await prisma.building.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { floors: true, classrooms: true } },
      classrooms: { select: { isActive: true } },
    },
  });

  return buildings.map((building) => ({
    buildingId: building.id,
    code: building.code,
    name: building.name,
    floorCount: building._count.floors,
    classroomCount: building._count.classrooms,
    activeClassroomCount: building.classrooms.filter((c) => c.isActive).length,
    inventoryDeferred: building.code === "TP1",
  }));
}

export type AdminInventoryRow = {
  classroomId: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  isActive: boolean;
  official: boolean;
};

export async function getAdminInventory(): Promise<AdminInventoryRow[]> {
  const rows = await prisma.classroom.findMany({
    orderBy: [
      { building: { code: "asc" } },
      { floor: { floorNumber: "asc" } },
      { roomNumber: "asc" },
    ],
    select: {
      id: true,
      roomNumber: true,
      isActive: true,
      building: { select: { code: true } },
      floor: { select: { floorNumber: true } },
    },
  });

  return rows.map((row) => ({
    classroomId: row.id,
    buildingCode: row.building.code,
    floorNumber: row.floor.floorNumber,
    roomNumber: row.roomNumber,
    isActive: row.isActive,
    official: isOfficialInventoryRoom(
      row.building.code,
      row.floor.floorNumber,
      row.roomNumber,
    ),
  }));
}

export type AdminReportRow = {
  freeReportId: string;
  status: string;
  confirmationCount: number;
  occupiedStrikes: number;
  eventCount: number;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  slotOrder: number;
  reportDate: string;
  createdAt: string;
  expiresAt: string;
  contributorFingerprint: string;
};

export async function getAdminReports(limit = 80): Promise<AdminReportRow[]> {
  const rows = await prisma.freeReport.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      classroom: {
        select: {
          roomNumber: true,
          building: { select: { code: true } },
          floor: { select: { floorNumber: true } },
        },
      },
      timeSlot: { select: { slotOrder: true } },
      occupiedReports: { select: { id: true } },
      reportEvents: { select: { id: true } },
    },
  });

  return rows.map((row) => ({
    freeReportId: row.id,
    status: row.status,
    confirmationCount: row.confirmationCount,
    occupiedStrikes: row.occupiedReports.length,
    eventCount: row.reportEvents.length,
    buildingCode: row.classroom.building.code,
    floorNumber: row.classroom.floor.floorNumber,
    roomNumber: row.classroom.roomNumber,
    slotOrder: row.timeSlot.slotOrder,
    reportDate: row.reportDate.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    contributorFingerprint: formatTokenFingerprint(row.contributorToken),
  }));
}

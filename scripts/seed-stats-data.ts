/**
 * Seed varied free_reports for Stats aggregates (Phase 10).
 * Run: npx tsx scripts/seed-stats-data.ts
 */
import { PrismaClient, type FreeReportStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

function campusToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgoYmd(n: number): string {
  const today = campusToday();
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function upsertReport(args: {
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  slotOrder: number;
  reportYmd: string;
  status: FreeReportStatus;
  confirmationCount: number;
}) {
  const building = await prisma.building.findFirst({
    where: { code: args.buildingCode },
  });
  if (!building) throw new Error(`missing ${args.buildingCode}`);
  const floor = await prisma.floor.findFirst({
    where: { buildingId: building.id, floorNumber: args.floorNumber },
  });
  if (!floor) throw new Error("missing floor");
  const slot = await prisma.timeSlot.findFirst({
    where: { slotOrder: args.slotOrder },
  });
  if (!slot) throw new Error("missing slot");

  const classroom = await prisma.classroom.upsert({
    where: {
      buildingId_floorId_roomNumber: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber: args.roomNumber,
      },
    },
    create: {
      buildingId: building.id,
      floorId: floor.id,
      roomNumber: args.roomNumber,
    },
    update: {},
  });

  const reportDate = new Date(`${args.reportYmd}T00:00:00.000Z`);
  const expiresAt = new Date(Date.now() + 86_400_000);

  await prisma.freeReport.upsert({
    where: {
      classroomId_timeSlotId_reportDate: {
        classroomId: classroom.id,
        timeSlotId: slot.id,
        reportDate,
      },
    },
    create: {
      classroomId: classroom.id,
      timeSlotId: slot.id,
      reportDate,
      contributorToken: randomUUID(),
      status: args.status,
      confirmationCount: args.confirmationCount,
      expiresAt,
    },
    update: {
      status: args.status,
      confirmationCount: args.confirmationCount,
      expiresAt,
    },
  });
}

async function main() {
  const today = campusToday();
  const d1 = daysAgoYmd(1);
  const d2 = daysAgoYmd(2);

  const plan: Array<{
    buildingCode: string;
    floorNumber: number;
    roomNumber: string;
    slotOrder: number;
    reportYmd: string;
    status: FreeReportStatus;
    confirmationCount: number;
  }> = [
    // Today — UB busy
    { buildingCode: "UB", floorNumber: 5, roomNumber: "501", slotOrder: 6, reportYmd: today, status: "confirmed", confirmationCount: 3 },
    { buildingCode: "UB", floorNumber: 5, roomNumber: "502", slotOrder: 6, reportYmd: today, status: "unverified", confirmationCount: 1 },
    { buildingCode: "UB", floorNumber: 6, roomNumber: "601", slotOrder: 7, reportYmd: today, status: "confirmed", confirmationCount: 2 },
    { buildingCode: "TP1", floorNumber: 3, roomNumber: "301", slotOrder: 6, reportYmd: today, status: "unverified", confirmationCount: 1 },
    { buildingCode: "TP2", floorNumber: 4, roomNumber: "401", slotOrder: 8, reportYmd: today, status: "hidden", confirmationCount: 1 },
    // Earlier this week — slot 6 popular; room 501 reported again for HAVING
    { buildingCode: "UB", floorNumber: 5, roomNumber: "501", slotOrder: 5, reportYmd: d1, status: "confirmed", confirmationCount: 2 },
    { buildingCode: "UB", floorNumber: 5, roomNumber: "501", slotOrder: 6, reportYmd: d1, status: "expired", confirmationCount: 2 },
    { buildingCode: "TP1", floorNumber: 3, roomNumber: "302", slotOrder: 6, reportYmd: d1, status: "confirmed", confirmationCount: 2 },
    { buildingCode: "TP1", floorNumber: 4, roomNumber: "401", slotOrder: 6, reportYmd: d2, status: "unverified", confirmationCount: 1 },
    { buildingCode: "TP2", floorNumber: 5, roomNumber: "502", slotOrder: 7, reportYmd: d2, status: "confirmed", confirmationCount: 4 },
    { buildingCode: "UB", floorNumber: 7, roomNumber: "701", slotOrder: 6, reportYmd: d2, status: "confirmed", confirmationCount: 2 },
  ];

  for (const row of plan) {
    await upsertReport(row);
  }

  console.log(`Seeded ${plan.length} free_reports for Stats (today=${today})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

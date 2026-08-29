/**
 * Phase 11.3 — permanently delete known QA/test fixtures from the database.
 *
 * Provenance:
 *   P9H0–P9H2, P9T1–P9T3 — scripts/test-phase9-trust.ts (ensureClassroom / simulateConfirmations)
 *   P7TEST              — scripts/test-phase7-report.ts
 *   P8EXP               — scripts/test-phase8-expire.ts
 *   UB 1219 report      — scripts/test-v2-6-admin-and-live-data.ts (2099 sentinel only;
 *                         classroom row is official inventory and is preserved)
 *
 * Default: dry-run (read-only audit).
 * Execute:  set -a && source .env && set +a && npx tsx scripts/cleanup-phase11-test-data.ts --execute
 *
 * NEVER wired into npm run dev/build/test.
 */

import { PrismaClient } from "@prisma/client";
import { isOfficialInventoryRoom } from "../prisma/data/classroom-inventory";

const prisma = new PrismaClient();

/** Artificial classrooms created solely by QA scripts — not in official inventory. */
const TEST_ONLY_ROOM_NUMBERS = [
  "P9H0",
  "P9H1",
  "P9H2",
  "P9T1",
  "P9T2",
  "P9T3",
  "P7TEST",
  "P8EXP",
] as const;

const UB_1219_SENTINEL_EXPIRY = new Date("2099-01-01T00:00:00.000Z");

type AuditReport = {
  id: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  reportDate: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  occupiedCount: number;
  eventCount: number;
  provenance: string;
};

type AuditClassroom = {
  id: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  isActive: boolean;
  reportCount: number;
  provenance: string;
};

function assertSafeTestClassroom(row: {
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
}): void {
  if (row.buildingCode !== "UB") {
    throw new Error(
      `Refusing classroom ${row.buildingCode} ${row.roomNumber}: expected UB test fixture`,
    );
  }
  if (
    !TEST_ONLY_ROOM_NUMBERS.includes(
      row.roomNumber as (typeof TEST_ONLY_ROOM_NUMBERS)[number],
    )
  ) {
    throw new Error(
      `Refusing classroom ${row.roomNumber}: not in explicit test-only allowlist`,
    );
  }
  if (isOfficialInventoryRoom(row.buildingCode, row.floorNumber, row.roomNumber)) {
    throw new Error(
      `Refusing classroom UB F${row.floorNumber} ${row.roomNumber}: part of official inventory`,
    );
  }
}

function assertSafeUb1219SentinelReport(row: {
  id: string;
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  expiresAt: Date;
}): void {
  if (row.buildingCode !== "UB" || row.roomNumber !== "1219" || row.floorNumber !== 12) {
    throw new Error(
      `Refusing report ${row.id}: UB 1219 sentinel must be UB F12 1219`,
    );
  }
  if (row.expiresAt.toISOString() !== UB_1219_SENTINEL_EXPIRY.toISOString()) {
    throw new Error(
      `Refusing report ${row.id}: expiresAt ${row.expiresAt.toISOString()} is not 2099 sentinel`,
    );
  }
}

async function audit(): Promise<{
  reports: AuditReport[];
  classrooms: AuditClassroom[];
  ub1219SentinelReportIds: string[];
}> {
  const testClassrooms = await prisma.classroom.findMany({
    where: { roomNumber: { in: [...TEST_ONLY_ROOM_NUMBERS] } },
    include: {
      building: { select: { code: true } },
      floor: { select: { floorNumber: true } },
      _count: { select: { freeReports: true } },
    },
    orderBy: [{ building: { code: "asc" } }, { roomNumber: "asc" }],
  });

  const classrooms: AuditClassroom[] = [];
  for (const row of testClassrooms) {
    const entry = {
      buildingCode: row.building.code,
      floorNumber: row.floor.floorNumber,
      roomNumber: row.roomNumber,
    };
    assertSafeTestClassroom(entry);
    classrooms.push({
      id: row.id,
      ...entry,
      isActive: row.isActive,
      reportCount: row._count.freeReports,
      provenance:
        row.roomNumber.startsWith("P9")
          ? "scripts/test-phase9-trust.ts"
          : row.roomNumber === "P7TEST"
            ? "scripts/test-phase7-report.ts"
            : "scripts/test-phase8-expire.ts",
    });
  }

  const testReports = await prisma.freeReport.findMany({
    where: {
      OR: [
        { classroom: { roomNumber: { in: [...TEST_ONLY_ROOM_NUMBERS] } } },
        {
          classroom: {
            building: { code: "UB" },
            roomNumber: "1219",
            floor: { floorNumber: 12 },
          },
          expiresAt: UB_1219_SENTINEL_EXPIRY,
        },
      ],
    },
    include: {
      classroom: {
        include: {
          building: { select: { code: true } },
          floor: { select: { floorNumber: true } },
        },
      },
      timeSlot: { select: { slotOrder: true } },
      _count: { select: { occupiedReports: true, reportEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const reports: AuditReport[] = [];
  const ub1219SentinelReportIds: string[] = [];

  for (const row of testReports) {
    const buildingCode = row.classroom.building.code;
    const floorNumber = row.classroom.floor.floorNumber;
    const roomNumber = row.classroom.roomNumber;

    let provenance: string;
    if (roomNumber === "1219") {
      assertSafeUb1219SentinelReport({
        id: row.id,
        buildingCode,
        floorNumber,
        roomNumber,
        expiresAt: row.expiresAt,
      });
      provenance = "scripts/test-v2-6-admin-and-live-data.ts (2099 sentinel; classroom preserved)";
      ub1219SentinelReportIds.push(row.id);
    } else {
      assertSafeTestClassroom({ buildingCode, floorNumber, roomNumber });
      provenance = roomNumber.startsWith("P9")
        ? "scripts/test-phase9-trust.ts"
        : roomNumber === "P7TEST"
          ? "scripts/test-phase7-report.ts"
          : "scripts/test-phase8-expire.ts";
    }

    reports.push({
      id: row.id,
      buildingCode,
      floorNumber,
      roomNumber,
      reportDate: row.reportDate.toISOString().slice(0, 10),
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      occupiedCount: row._count.occupiedReports,
      eventCount: row._count.reportEvents,
      provenance,
    });
  }

  return { reports, classrooms, ub1219SentinelReportIds };
}

function printAudit(data: ReturnType<typeof audit> extends Promise<infer T> ? T : never) {
  console.log("\n=== Phase 11.3 QA cleanup audit ===\n");

  console.log(`Reports to delete: ${data.reports.length}`);
  for (const r of data.reports) {
    console.log(
      `  ${r.buildingCode} F${r.floorNumber} ${r.roomNumber} | id=${r.id} | status=${r.status} | reportDate=${r.reportDate} | expiresAt=${r.expiresAt} | occupied=${r.occupiedCount} events=${r.eventCount}`,
    );
    console.log(`    provenance: ${r.provenance}`);
  }

  console.log(`\nTest-only classrooms to delete: ${data.classrooms.length}`);
  for (const c of data.classrooms) {
    console.log(
      `  ${c.buildingCode} F${c.floorNumber} ${c.roomNumber} | id=${c.id} | active=${c.isActive} | reports=${c.reportCount}`,
    );
    console.log(`    provenance: ${c.provenance}`);
  }

  console.log(
    `\nUB F12 1219 classroom: PRESERVED (official inventory). Sentinel reports only: ${data.ub1219SentinelReportIds.length}`,
  );
}

async function verifyClean(): Promise<void> {
  const remainingReports = await prisma.freeReport.findMany({
    where: {
      OR: [
        { classroom: { roomNumber: { in: [...TEST_ONLY_ROOM_NUMBERS, "1219"] } } },
      ],
    },
    include: {
      classroom: {
        include: {
          building: { select: { code: true } },
          floor: { select: { floorNumber: true } },
        },
      },
    },
  });

  const badReports = remainingReports.filter((r) => {
    const room = r.classroom.roomNumber;
    if (TEST_ONLY_ROOM_NUMBERS.includes(room as (typeof TEST_ONLY_ROOM_NUMBERS)[number])) {
      return true;
    }
    if (
      room === "1219" &&
      r.classroom.building.code === "UB" &&
      r.classroom.floor.floorNumber === 12 &&
      r.expiresAt.toISOString() === UB_1219_SENTINEL_EXPIRY.toISOString()
    ) {
      return true;
    }
    return false;
  });

  const remainingClassrooms = await prisma.classroom.findMany({
    where: { roomNumber: { in: [...TEST_ONLY_ROOM_NUMBERS] } },
    include: { building: { select: { code: true } } },
  });

  console.log("\n=== Post-cleanup verification ===");
  console.log(`Remaining QA reports: ${badReports.length}`);
  console.log(`Remaining test-only classrooms: ${remainingClassrooms.length}`);

  if (badReports.length > 0 || remainingClassrooms.length > 0) {
    for (const r of badReports) {
      console.log(`  REPORT STILL EXISTS: ${r.classroom.building.code} ${r.classroom.roomNumber} id=${r.id}`);
    }
    for (const c of remainingClassrooms) {
      console.log(`  CLASSROOM STILL EXISTS: ${c.building.code} ${c.roomNumber} id=${c.id}`);
    }
    throw new Error("Cleanup incomplete — QA fixtures remain");
  }

  const ub1219 = await prisma.classroom.findFirst({
    where: {
      roomNumber: "1219",
      building: { code: "UB" },
      floor: { floorNumber: 12 },
    },
    select: { id: true },
  });
  if (!ub1219) {
    throw new Error("Official UB F12 1219 classroom missing — should be preserved");
  }
  console.log(`Official UB F12 1219 classroom preserved: id=${ub1219.id}`);
  console.log("ok  all known QA fixtures removed\n");
}

async function main() {
  const execute = process.argv.includes("--execute");
  const data = await audit();
  printAudit(data);

  if (!execute) {
    console.log("\nDry run only. Re-run with --execute to delete the records above.\n");
    return;
  }

  console.log("\n=== Executing deletion in transaction ===\n");

  const deletedReports: AuditReport[] = [];
  const deletedClassrooms: AuditClassroom[] = [];

  await prisma.$transaction(async (tx) => {
    if (data.ub1219SentinelReportIds.length > 0) {
      const sentinelRows = await tx.freeReport.findMany({
        where: { id: { in: data.ub1219SentinelReportIds } },
        include: {
          classroom: {
            include: {
              building: { select: { code: true } },
              floor: { select: { floorNumber: true } },
            },
          },
        },
      });
      for (const row of sentinelRows) {
        assertSafeUb1219SentinelReport({
          id: row.id,
          buildingCode: row.classroom.building.code,
          floorNumber: row.classroom.floor.floorNumber,
          roomNumber: row.classroom.roomNumber,
          expiresAt: row.expiresAt,
        });
      }
      const removed = await tx.freeReport.deleteMany({
        where: { id: { in: data.ub1219SentinelReportIds } },
      });
      console.log(`Deleted ${removed.count} UB 1219 sentinel report(s)`);
      deletedReports.push(
        ...data.reports.filter((r) => data.ub1219SentinelReportIds.includes(r.id)),
      );
    }

    const classroomIds = data.classrooms.map((c) => c.id);
    if (classroomIds.length > 0) {
      const rows = await tx.classroom.findMany({
        where: { id: { in: classroomIds } },
        include: {
          building: { select: { code: true } },
          floor: { select: { floorNumber: true } },
        },
      });
      for (const row of rows) {
        assertSafeTestClassroom({
          buildingCode: row.building.code,
          floorNumber: row.floor.floorNumber,
          roomNumber: row.roomNumber,
        });
      }
      const removed = await tx.classroom.deleteMany({
        where: { id: { in: classroomIds } },
      });
      console.log(`Deleted ${removed.count} test-only classroom(s) (cascaded reports/events)`);
      deletedClassrooms.push(...data.classrooms);
      deletedReports.push(
        ...data.reports.filter((r) => r.roomNumber !== "1219"),
      );
    }
  });

  await verifyClean();

  console.log("=== Deleted reports ===");
  for (const r of deletedReports) {
    console.log(`  ${r.buildingCode} ${r.roomNumber} | id=${r.id}`);
  }
  console.log("=== Deleted test classrooms ===");
  for (const c of deletedClassrooms) {
    console.log(`  ${c.buildingCode} F${c.floorNumber} ${c.roomNumber} | id=${c.id} | ${c.provenance}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

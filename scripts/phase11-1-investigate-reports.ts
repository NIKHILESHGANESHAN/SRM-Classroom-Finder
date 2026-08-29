/**
 * Phase 11.1 read-only report investigation — test fixtures, sentinels, stale-active rows.
 *
 * Does NOT modify or delete data. Default: dry-run listing only.
 *
 * Run:
 *   set -a && source .env && set +a && npx tsx scripts/phase11-1-investigate-reports.ts
 *
 * Optional cleanup preview (still no writes):
 *   npx tsx scripts/phase11-1-investigate-reports.ts --cleanup-preview
 */

import { PrismaClient } from "@prisma/client";
import { getEffectiveReportStatus, isReportTemporallyActive } from "../lib/report-integrity";
import { isAnomalousReportExpiry } from "../lib/admin/format-report-expiry";

const prisma = new PrismaClient();

const TEST_ROOM_PATTERNS = [
  "P9H0",
  "P9H1",
  "P9H2",
  "P9T1",
  "P9T2",
  "P9T3",
  "P7TEST",
  "P8EXP",
  "1219",
] as const;

async function main() {
  const cleanupPreview = process.argv.includes("--cleanup-preview");
  const now = new Date();

  console.log("\n=== Phase 11.1 Report Investigation (read-only) ===");
  console.log(`Server now: ${now.toISOString()}`);

  const testClassrooms = await prisma.classroom.findMany({
    where: { roomNumber: { in: [...TEST_ROOM_PATTERNS] } },
    include: {
      building: { select: { code: true } },
      floor: { select: { floorNumber: true } },
    },
    orderBy: [{ building: { code: "asc" } }, { roomNumber: "asc" }],
  });

  console.log(`\n--- Test fixture classrooms (${testClassrooms.length}) ---`);
  for (const c of testClassrooms) {
    console.log(
      `${c.building.code} F${c.floor.floorNumber} ${c.roomNumber} | active=${c.isActive} | id=${c.id}`,
    );
  }

  const testReports = await prisma.freeReport.findMany({
    where: { classroom: { roomNumber: { in: [...TEST_ROOM_PATTERNS] } } },
    include: {
      classroom: { include: { building: { select: { code: true } } } },
      timeSlot: { select: { slotOrder: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n--- Test fixture reports (${testReports.length}) ---`);
  for (const r of testReports) {
    const ymd = r.reportDate.toISOString().slice(0, 10);
    const effective = getEffectiveReportStatus(r.status, r.expiresAt, now);
    const sentinel = isAnomalousReportExpiry(r.expiresAt.toISOString(), ymd);
    console.log(
      `${r.classroom.building.code} ${r.classroom.roomNumber} slot=${r.timeSlot.slotOrder} | db=${r.status} effective=${effective} | reportDate=${ymd} | expiresAt=${r.expiresAt.toISOString()}${sentinel ? " (sentinel)" : ""} | id=${r.id}`,
    );
  }

  const staleActive = await prisma.freeReport.findMany({
    where: {
      status: { in: ["unverified", "confirmed"] },
      expiresAt: { lte: now },
    },
    include: {
      classroom: { include: { building: { select: { code: true } } } },
    },
    orderBy: { expiresAt: "asc" },
    take: 50,
  });

  console.log(`\n--- Stale-active rows (db live, expiresAt <= now): ${staleActive.length} ---`);
  for (const r of staleActive) {
    console.log(
      `${r.classroom.building.code} ${r.classroom.roomNumber} | db=${r.status} | expiresAt=${r.expiresAt.toISOString()} | reportDate=${r.reportDate.toISOString().slice(0, 10)} | id=${r.id}`,
    );
  }

  const sentinelReports = await prisma.freeReport.findMany({
    where: {
      OR: [
        { expiresAt: { gte: new Date("2099-01-01T00:00:00.000Z") } },
        { expiresAt: { lte: new Date("2000-01-02T00:00:00.000Z") } },
      ],
    },
    include: {
      classroom: { include: { building: { select: { code: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log(`\n--- Sentinel expiry rows (2000/2099): ${sentinelReports.length} ---`);
  for (const r of sentinelReports) {
    const temporal = isReportTemporallyActive(r.expiresAt, now) ? "temporal-active" : "temporal-expired";
    console.log(
      `${r.classroom.building.code} ${r.classroom.roomNumber} | db=${r.status} | ${temporal} | expiresAt=${r.expiresAt.toISOString()} | id=${r.id}`,
    );
  }

  if (cleanupPreview) {
    console.log("\n--- Cleanup preview (NO writes performed) ---");
    const wouldExpire = staleActive.length;
    const wouldReviewSentinels = sentinelReports.filter(
      (r) => r.classroom.roomNumber !== "1219" || r.status !== "expired",
    ).length;
    console.log(`Would mark expired (stale-active): ${wouldExpire} row(s)`);
    console.log(`Would review sentinel/test rows: ${wouldReviewSentinels} row(s)`);
    console.log("Run a dedicated cleanup script with --execute only after manual review.");
  }

  console.log("\nInvestigation complete. No database changes made.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

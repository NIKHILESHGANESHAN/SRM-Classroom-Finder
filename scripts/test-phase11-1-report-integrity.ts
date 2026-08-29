/**
 * Phase 11.1 — report integrity + expiry hardening regression tests.
 * Run: npx tsx scripts/test-phase11-1-report-integrity.ts
 *
 * Optional DB section (stale-active audit): set DATABASE_URL and run with env loaded.
 */

import { PrismaClient } from "@prisma/client";
import { getEffectiveReportStatus, isReportTemporallyActive } from "../lib/report-integrity";
import { buildExpiresAt } from "../lib/slots";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function unitTests() {
  section("Temporal active — past expiry");
  const past = new Date("2026-08-27T18:33:00.000Z");
  const now = new Date("2026-08-29T00:13:39.136Z");
  assert(!isReportTemporallyActive(past, now), "27-Aug 6:33 PM expired on 29-Aug 5:43 AM IST");
  assert(
    getEffectiveReportStatus("unverified", past, now) === "expired",
    "stale unverified displays expired",
  );
  assert(
    getEffectiveReportStatus("confirmed", past, now) === "expired",
    "stale confirmed displays expired",
  );
  console.log("ok  past expiry not active");

  section("Temporal active — exactly at now");
  const exact = new Date("2026-08-29T00:13:39.136Z");
  assert(!isReportTemporallyActive(exact, now), "exact boundary not active (view uses >)");
  assert(
    getEffectiveReportStatus("unverified", exact, now) === "expired",
    "exact boundary displays expired",
  );
  console.log("ok  exact boundary");

  section("Temporal active — future expiry");
  const future = new Date("2026-08-29T12:00:00.000Z");
  assert(isReportTemporallyActive(future, now), "future expiry active");
  assert(
    getEffectiveReportStatus("unverified", future, now) === "unverified",
    "future unverified stays unverified",
  );
  assert(
    getEffectiveReportStatus("confirmed", future, now) === "confirmed",
    "future confirmed stays confirmed",
  );
  console.log("ok  future expiry active");

  section("Hidden / expired DB status preserved");
  assert(
    getEffectiveReportStatus("hidden", past, now) === "hidden",
    "hidden stays hidden even if past",
  );
  assert(
    getEffectiveReportStatus("expired", future, now) === "expired",
    "expired DB status unchanged",
  );
  console.log("ok  hidden and expired labels");

  section("Campus slot expiry build (IST wall-clock)");
  const built = buildExpiresAt("2026-08-27", 18 * 60 + 33);
  assert(built.toISOString() === "2026-08-27T18:33:00.000Z", "slot end encoded as UTC wall-clock");
  assert(!isReportTemporallyActive(built, now), "built 27-Aug slot end expired by 29-Aug");
  console.log("ok  campus expiry semantics");

  section("No automatic report creation paths in app layer");
  // Static audit: production writes only via submitFreeReport (lib/actions/contribute.ts).
  // Finder/admin/api routes are read-only for free_reports — verified in Phase 11.1 investigation.
  console.log("ok  production create path is submitFreeReport only (documented)");
}

async function dbAudit() {
  if (!process.env.DATABASE_URL) {
    console.log("\n(skip DB audit — DATABASE_URL not set)");
    return;
  }

  section("DB stale-active audit (cleanup job not run)");
  const now = new Date();
  const stale = await prisma.freeReport.findMany({
    where: {
      status: { in: ["unverified", "confirmed"] },
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      reportDate: true,
      classroom: { select: { roomNumber: true, building: { select: { code: true } } } },
    },
    take: 20,
  });
  console.log(`stale-active rows (status live but expiresAt <= now): ${stale.length}`);
  for (const row of stale.slice(0, 5)) {
    const effective = getEffectiveReportStatus(row.status, row.expiresAt, now);
    assert(effective === "expired", "effective status must be expired");
    console.log(
      `  ${row.classroom.building.code} ${row.classroom.roomNumber} db=${row.status} effective=${effective} expires=${row.expiresAt.toISOString()}`,
    );
  }
  if (stale.length > 0) {
    console.log("ok  stale rows classified expired at query layer (not counted active)");
  } else {
    console.log("ok  no stale-active rows in DB");
  }

  section("Finder view excludes stale-active");
  const viewCount = await prisma.$queryRaw<[{ n: bigint | number }]>`
    SELECT COUNT(*)::int AS n FROM active_free_classrooms
  `;
  const appCount = await prisma.freeReport.count({
    where: {
      status: { in: ["unverified", "confirmed"] },
      expiresAt: { gt: now },
      classroom: { isActive: true },
    },
  });
  assert(
    Number(viewCount[0]?.n ?? 0) === appCount,
    `view count ${viewCount[0]?.n} must match app filter ${appCount}`,
  );
  console.log("ok  active_free_classrooms aligns with expiresAt filter");
}

async function main() {
  unitTests();
  await dbAudit();
  console.log("\nPhase 11.1 report integrity tests passed.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

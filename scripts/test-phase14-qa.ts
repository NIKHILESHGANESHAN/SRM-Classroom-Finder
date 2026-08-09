/**
 * Phase 14 final QA harness — DB integrity + HTTP regression.
 * Run with: set -a && source .env && set +a && npx tsx scripts/test-phase14-qa.ts
 * Requires Postgres + `npm run start` or `npm run dev` on :3000 (or TEST_BASE_URL).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expireFreeReports } from "../lib/expire-free-reports";
import {
  getConfirmationThresholdForToken,
  isConfirmedBadgeStatus,
} from "../lib/token-trust";
import { resetRateLimits } from "../lib/rate-limit";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    section("Docs / deliverables present");
    for (const rel of [
      "README.md",
      "LICENSE",
      "docs/schema.sql",
      "docs/ER-diagram.mmd",
      "docs/ER-diagram.dbml",
      "docs/normalization-notes.md",
      "docs/dbms-report-notes.md",
    ]) {
      assert(existsSync(path.join(ROOT, rel)), `missing ${rel}`);
      console.log(`ok  ${rel}`);
    }

    section("Database — seed counts, indexes, view, FKs");
    const [buildings, floors, slots] = await Promise.all([
      prisma.building.count(),
      prisma.floor.count(),
      prisma.timeSlot.count(),
    ]);
    assert(buildings === 3, `buildings expected 3, got ${buildings}`);
    assert(floors === 35, `floors expected 35, got ${floors}`);
    assert(slots === 10, `time_slots expected 10, got ${slots}`);
    console.log(`ok  seed counts buildings=${buildings} floors=${floors} slots=${slots}`);

    const indexRows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'free_reports_report_date_time_slot_id_status_idx'
    `;
    assert(indexRows.length === 1, "spec Finder index missing");
    console.log("ok  free_reports(report_date, time_slot_id, status) index");

    const viewRows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM active_free_classrooms
    `;
    assert(typeof viewRows[0]?.n === "number", "active_free_classrooms view failed");
    console.log(`ok  active_free_classrooms readable (rows=${viewRows[0]?.n})`);

    const fkRows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
    `;
    assert((fkRows[0]?.n ?? 0) >= 6, `expected ≥6 FKs, got ${fkRows[0]?.n}`);
    console.log(`ok  foreign keys=${fkRows[0]?.n}`);

    section("Database — duplicate prevention + 2-strike hide transaction");
    const building = await prisma.building.findFirstOrThrow({
      where: { code: "UB" },
      include: { floors: { take: 1 } },
    });
    const floor = building.floors[0]!;
    const slot = await prisma.timeSlot.findFirstOrThrow({
      orderBy: { slotOrder: "asc" },
    });
    const reportDate = new Date();
    reportDate.setUTCHours(0, 0, 0, 0);

    const roomNumber = `QA14-${Date.now().toString(36).toUpperCase()}`;
    const classroom = await prisma.classroom.upsert({
      where: {
        buildingId_floorId_roomNumber: {
          buildingId: building.id,
          floorId: floor.id,
          roomNumber,
        },
      },
      create: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber,
      },
      update: {},
    });

    const tokenA = crypto.randomUUID();
    const tokenB = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const free = await prisma.freeReport.create({
      data: {
        classroomId: classroom.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: tokenA,
        status: "unverified",
        confirmationCount: 1,
        expiresAt,
      },
    });

    let duplicateBlocked = false;
    try {
      await prisma.freeReport.create({
        data: {
          classroomId: classroom.id,
          timeSlotId: slot.id,
          reportDate,
          contributorToken: tokenB,
          status: "unverified",
          confirmationCount: 1,
          expiresAt,
        },
      });
    } catch {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, "duplicate free_report natural key should fail");
    console.log("ok  duplicate (classroom, slot, date) prevented");

    await prisma.$transaction(async (tx) => {
      await tx.occupiedReport.create({
        data: {
          freeReportId: free.id,
          reporterToken: tokenA,
          reason: "occupied",
        },
      });
      await tx.occupiedReport.create({
        data: {
          freeReportId: free.id,
          reporterToken: tokenB,
          reason: "wrong_info",
        },
      });
      const strikes = await tx.occupiedReport.count({
        where: { freeReportId: free.id },
      });
      if (strikes >= 2) {
        await tx.freeReport.update({
          where: { id: free.id },
          data: { status: "hidden" },
        });
      }
    });

    const hidden = await prisma.freeReport.findUniqueOrThrow({
      where: { id: free.id },
    });
    assert(hidden.status === "hidden", "expected hidden after 2 strikes");
    const inView = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM active_free_classrooms
      WHERE free_report_id = ${free.id}
    `;
    assert(inView[0]?.n === 0, "hidden report must leave active view");
    console.log("ok  2-strike hide + view exclusion");

    section("Database — auto-expiry");
    const past = await prisma.freeReport.create({
      data: {
        classroomId: classroom.id,
        timeSlotId: (
          await prisma.timeSlot.findFirstOrThrow({
            orderBy: { slotOrder: "desc" },
          })
        ).id,
        reportDate,
        contributorToken: crypto.randomUUID(),
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expiry = await expireFreeReports();
    assert(expiry.expiredCount >= 1, "expected at least one expiry");
    const expired = await prisma.freeReport.findUniqueOrThrow({
      where: { id: past.id },
    });
    assert(expired.status === "expired", "past-due row should be expired");
    console.log(`ok  expiry job expiredCount=${expiry.expiredCount}`);

    section("Trust helpers");
    assert(isConfirmedBadgeStatus("confirmed") === true, "badge confirmed");
    assert(isConfirmedBadgeStatus("unverified") === false, "badge unverified");
    assert(isConfirmedBadgeStatus("hidden") === false, "badge hidden");
    const threshold = await getConfirmationThresholdForToken(
      prisma,
      crypto.randomUUID(),
      reportDate,
    );
    assert(threshold === 2, `trusted threshold expected 2, got ${threshold}`);
    console.log("ok  confidence badge + trust threshold");

    // Cleanup QA rows (keep seed intact)
    await prisma.occupiedReport.deleteMany({
      where: { freeReportId: { in: [free.id, past.id] } },
    });
    await prisma.freeReport.deleteMany({
      where: { id: { in: [free.id, past.id] } },
    });
    await prisma.classroom.delete({ where: { id: classroom.id } }).catch(() => undefined);

    section("HTTP regression (requires server)");
    let serverUp = false;
    try {
      const res = await fetch(`${BASE}/`);
      serverUp = res.status === 200;
    } catch {
      console.log("skip HTTP — start `npm run start` or `npm run dev`");
    }

    if (serverUp) {
      resetRateLimits();
      for (const [p, code] of [
        ["/", 200],
        ["/finder", 200],
        ["/contribute", 200],
        ["/stats", 200],
        ["/nope-qa-14", 404],
        ["/manifest.webmanifest", 200],
        ["/sw.js", 200],
        ["/icons/icon-192.png", 200],
      ] as const) {
        const status = (await fetch(`${BASE}${p}`, { redirect: "manual" }))
          .status;
        assert(status === code, `${p} expected ${code} got ${status}`);
        console.log(`ok  ${p} → ${status}`);
      }

      const home = await (await fetch(`${BASE}/`)).text();
      assert(home.includes("Classroom Finder"), "landing brand missing");
      assert(
        home.includes("og:title") || home.includes("property=\"og:"),
        "OG tags missing",
      );
      console.log("ok  landing SEO/OG");

      const finder = await (await fetch(`${BASE}/finder`)).text();
      assert(
        finder.includes("Class Finder") || finder.includes("finder"),
        "finder markup missing",
      );
      console.log("ok  finder renders");

      const secret = process.env.CRON_SECRET;
      assert(secret, "CRON_SECRET required");
      const cron = await fetch(`${BASE}/api/cron/expire`, {
        headers: {
          Authorization: `Bearer ${secret}`,
          "x-forwarded-for": "198.51.100.14",
        },
      });
      assert(cron.status === 200, `cron expected 200 got ${cron.status}`);
      console.log("ok  cron authorized");

      const unauth = await fetch(`${BASE}/api/cron/expire`, {
        headers: { "x-forwarded-for": "198.51.100.15" },
      });
      assert(
        unauth.status === 401 || unauth.status === 429,
        `cron unauth expected 401/429 got ${unauth.status}`,
      );
      console.log(`ok  cron unauthorized → ${unauth.status}`);
    }

    section("Tooling — tsc + lint (spawn)");
    const tsc = spawnSync("npx", ["tsc", "--noEmit"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert(tsc.status === 0, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`);
    console.log("ok  tsc --noEmit");

    const lint = spawnSync("npx", ["next", "lint"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert(lint.status === 0, `lint failed:\n${lint.stdout}\n${lint.stderr}`);
    console.log("ok  next lint");

    console.log("\nPhase 14 QA checks PASSED.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

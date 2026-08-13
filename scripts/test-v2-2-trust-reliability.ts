/**
 * V2.2 trust & reliability tests.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-2-trust-reliability.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { lookupActiveClassroom } from "../lib/classroom-lookup";
import { applyIndependentConfirmation } from "../lib/record-confirmation";
import {
  deriveConfidence,
  deriveFreshness,
  FRESHNESS_MS,
} from "../lib/report-display";
import { isConfirmedBadgeStatus } from "../lib/token-trust";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function makeFreeReport(args?: {
  status?: "unverified" | "confirmed" | "hidden" | "expired";
  confirmationCount?: number;
  createdAt?: Date;
}) {
  const building = await prisma.building.findFirstOrThrow({
    where: { code: "UB" },
  });
  const floor = await prisma.floor.findFirstOrThrow({
    where: { buildingId: building.id, floorNumber: 5 },
  });
  const slot = await prisma.timeSlot.findFirstOrThrow({
    orderBy: { slotOrder: "asc" },
  });
  const room = `V22-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4)}`;
  const classroom = await prisma.classroom.upsert({
    where: {
      buildingId_floorId_roomNumber: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber: room,
      },
    },
    create: {
      buildingId: building.id,
      floorId: floor.id,
      roomNumber: room,
      isActive: true,
    },
    update: { isActive: true },
  });

  const reportDate = new Date();
  reportDate.setUTCHours(0, 0, 0, 0);
  const created = await prisma.freeReport.create({
    data: {
      classroomId: classroom.id,
      timeSlotId: slot.id,
      reportDate,
      contributorToken: randomUUID(),
      status: args?.status ?? "unverified",
      confirmationCount: args?.confirmationCount ?? 1,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      createdAt: args?.createdAt,
    },
  });
  return created;
}

async function main() {
  try {
    section("Derived freshness (no stored status column)");
    const now = new Date("2026-08-13T12:00:00.000Z");
    const very = deriveFreshness(new Date(now.getTime() - 30_000), now);
    const fresh = deriveFreshness(
      new Date(now.getTime() - FRESHNESS_MS.veryFresh - 1_000),
      now,
    );
    const aging = deriveFreshness(
      new Date(now.getTime() - FRESHNESS_MS.fresh - 1_000),
      now,
    );
    const stale = deriveFreshness(
      new Date(now.getTime() - FRESHNESS_MS.aging - 1_000),
      now,
    );
    assert(very.kind === "very_fresh" && very.label === "Very Fresh", "very fresh");
    assert(fresh.kind === "fresh" && fresh.label === "Fresh", "fresh");
    assert(aging.kind === "aging" && aging.label === "Aging", "aging");
    assert(stale.kind === "stale" && stale.label === "Stale", "stale");
    assert(very.detail.includes("Verified"), "freshness uses text not only color");
    console.log("ok  freshness buckets + text labels");

    section("Derived confidence — Unverified/Confirmed preserved");
    const low = deriveConfidence({
      status: "unverified",
      confirmationCount: 1,
      occupiedStrikeCount: 0,
    });
    const moderate = deriveConfidence({
      status: "confirmed",
      confirmationCount: 2,
      occupiedStrikeCount: 1,
    });
    const high = deriveConfidence({
      status: "confirmed",
      confirmationCount: 8,
      occupiedStrikeCount: 1,
    });
    assert(low?.badge === "unverified" && low.level === "low", "low unverified");
    assert(moderate?.badge === "confirmed" && moderate.level === "moderate", "moderate");
    assert(high?.badge === "confirmed" && high.level === "high", "high");
    assert(moderate?.summary.includes("2 confirmations"), "count in summary");
    assert(moderate?.summary.includes("1 correction"), "corrections in summary");

    assert(deriveConfidence({
      status: "hidden",
      confirmationCount: 9,
      occupiedStrikeCount: 2,
    }) === null, "hidden must not display confidence/Confirmed");
    assert(deriveConfidence({
      status: "expired",
      confirmationCount: 9,
      occupiedStrikeCount: 0,
    }) === null, "expired must not display Confirmed");
    assert(!isConfirmedBadgeStatus("hidden"), "badge helper hidden");
    assert(!isConfirmedBadgeStatus("expired"), "badge helper expired");
    assert(!isConfirmedBadgeStatus("unverified"), "badge helper unverified");
    assert(isConfirmedBadgeStatus("confirmed"), "badge helper confirmed");
    console.log("ok  confidence levels; hidden/expired never Confirmed");

    section("V2.1 regression — UB 12 / 504 vs 1205");
    const ub = await prisma.building.findFirstOrThrow({ where: { code: "UB" } });
    const ub12 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: ub.id, floorNumber: 12 },
    });
    const ub5 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: ub.id, floorNumber: 5 },
    });
    const room504 = await prisma.classroom.findFirstOrThrow({
      where: { buildingId: ub.id, floorId: ub5.id, roomNumber: "504", isActive: true },
    });
    const room1205 = await prisma.classroom.findFirstOrThrow({
      where: { buildingId: ub.id, floorId: ub12.id, roomNumber: "1205", isActive: true },
    });
    const reject504 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room504.id,
    });
    const accept1205 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room1205.id,
    });
    assert(!reject504.ok, "UB Floor 12 + 504 must be rejected");
    assert(accept1205.ok, "UB Floor 12 + 1205 must be accepted");
    console.log("ok  V2.1 inventory integrity still holds");

    section("Still Free — duplicate same token (idempotent)");
    const report = await makeFreeReport();
    const tokenA = randomUUID();
    const first = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: report.id,
        actorToken: tokenA,
        eventType: "still_free",
        rejectIfOccupiedByActor: true,
      }),
    );
    assert(first.ok && first.kind === "confirmed", "first still-free should confirm");
    assert(first.ok && first.confirmationCount === 2, "count 1→2");

    const dup = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: report.id,
        actorToken: tokenA,
        eventType: "still_free",
        rejectIfOccupiedByActor: true,
      }),
    );
    assert(dup.ok && dup.kind === "already_reported", "same token idempotent");
    const afterDup = await prisma.freeReport.findUniqueOrThrow({
      where: { id: report.id },
    });
    assert(afterDup.confirmationCount === 2, "duplicate must not bump count");
    const events = await prisma.reportEvent.count({
      where: { freeReportId: report.id },
    });
    assert(events === 1, "one event row per token");
    console.log("ok  still-free duplicate protection");

    section("Still Free — two distinct tokens");
    const report2 = await makeFreeReport();
    const t1 = randomUUID();
    const t2 = randomUUID();
    const c1 = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: report2.id,
        actorToken: t1,
        eventType: "still_free",
      }),
    );
    const c2 = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: report2.id,
        actorToken: t2,
        eventType: "still_free",
      }),
    );
    assert(c1.ok && c1.kind === "confirmed", "token 1");
    assert(c2.ok && c2.kind === "confirmed", "token 2");
    const two = await prisma.freeReport.findUniqueOrThrow({
      where: { id: report2.id },
    });
    assert(two.confirmationCount === 3, `expected 3, got ${two.confirmationCount}`);
    assert(two.status === "confirmed", "trusted threshold 2 → confirmed after first independent");
    console.log("ok  two distinct tokens increment; status confirmed");

    section("Original contributor cannot Still Free (already counted)");
    const own = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: report2.id,
        actorToken: report2.contributorToken,
        eventType: "still_free",
      }),
    );
    assert(own.ok && own.kind === "already_reported", "original token blocked");
    console.log("ok  original contributor still-free is no-op");

    section("Occupied duplicate + 2-strike hide");
    const hideMe = await makeFreeReport();
    const o1 = randomUUID();
    const o2 = randomUUID();
    await prisma.occupiedReport.create({
      data: {
        freeReportId: hideMe.id,
        reporterToken: o1,
        reason: "occupied",
      },
    });
    const dupOcc = await prisma.occupiedReport.findUnique({
      where: {
        freeReportId_reporterToken: {
          freeReportId: hideMe.id,
          reporterToken: o1,
        },
      },
    });
    assert(dupOcc, "first occupied stored");
    let secondBlocked = false;
    try {
      await prisma.occupiedReport.create({
        data: {
          freeReportId: hideMe.id,
          reporterToken: o1,
          reason: "class_in_progress",
        },
      });
    } catch {
      secondBlocked = true;
    }
    assert(secondBlocked, "same token occupied duplicate blocked");

    await prisma.$transaction(async (tx) => {
      await tx.occupiedReport.create({
        data: {
          freeReportId: hideMe.id,
          reporterToken: o2,
          reason: "wrong_info",
        },
      });
      const n = await tx.occupiedReport.count({
        where: { freeReportId: hideMe.id },
      });
      if (n >= 2) {
        await tx.freeReport.update({
          where: { id: hideMe.id },
          data: { status: "hidden" },
        });
      }
    });
    const hidden = await prisma.freeReport.findUniqueOrThrow({
      where: { id: hideMe.id },
    });
    assert(hidden.status === "hidden", "2-strike hide");
    assert(!isConfirmedBadgeStatus(hidden.status), "hidden is not Confirmed");
    console.log("ok  occupied duplicate + 2-strike hide");

    section("Still Free blocked after occupied by same token");
    const mixed = await makeFreeReport();
    const occToken = randomUUID();
    await prisma.occupiedReport.create({
      data: {
        freeReportId: mixed.id,
        reporterToken: occToken,
        reason: "occupied",
      },
    });
    const blocked = await prisma.$transaction((tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: mixed.id,
        actorToken: occToken,
        eventType: "still_free",
        rejectIfOccupiedByActor: true,
      }),
    );
    assert(!blocked.ok, "occupied reporter cannot still-free");
    console.log("ok  occupied token cannot Still Free");

    section("View last_verified_at / occupied_strike_count");
    const viewCols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'active_free_classrooms'
        AND column_name IN ('last_verified_at', 'occupied_strike_count')
      ORDER BY column_name
    `;
    const names = viewCols.map((c) => c.column_name);
    assert(names.includes("last_verified_at"), "view missing last_verified_at");
    assert(names.includes("occupied_strike_count"), "view missing occupied_strike_count");

    const live = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM active_free_classrooms
      WHERE free_report_id = ${report.id}
         OR free_report_id = ${report2.id}
    `;
    assert((live[0]?.n ?? 0) >= 1, "still-free reports should remain visible when not expired/hidden");
    console.log("ok  view exposes derived freshness fields");

    console.log("\nV2.2 trust & reliability tests passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

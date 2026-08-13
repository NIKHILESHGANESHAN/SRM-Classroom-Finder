/**
 * V2.1 classroom inventory integrity.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-1-classroom-integrity.ts
 */

import { PrismaClient } from "@prisma/client";
import { lookupActiveClassroom } from "../lib/classroom-lookup";
import { queryFinderCoverage } from "../lib/finder-data";
import {
  CLASSROOM_INVENTORY,
  countInventoryRooms,
  flattenClassroomInventory,
} from "../prisma/data/classroom-inventory";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  try {
    section("Inventory file vs seed (no invented rooms)");
    const listed = flattenClassroomInventory();
    const ubListed = countInventoryRooms("UB");
    const tp2Listed = countInventoryRooms("TP2");
    assert(ubListed === 77, `UB listed rooms expected 77, got ${ubListed}`);
    assert(tp2Listed === 78, `TP2 listed rooms expected 78, got ${tp2Listed}`);
    assert(listed.length === 155, `total listed expected 155, got ${listed.length}`);
    assert(
      !CLASSROOM_INVENTORY.UB[12].includes("504"),
      "inventory file must not place 504 on UB floor 12",
    );
    assert(
      CLASSROOM_INVENTORY.UB[12].includes("1205"),
      "inventory file must include 1205 on UB floor 12",
    );
    assert(
      !listed.some((r) => (r as { buildingCode: string }).buildingCode === "TP1"),
      "inventory file must not include TP1",
    );
    console.log(`ok  listed UB=${ubListed} TP2=${tp2Listed} total=${listed.length}`);

    const buildings = await prisma.building.findMany({
      include: { floors: true },
    });
    const ub = buildings.find((b) => b.code === "UB");
    const tp1 = buildings.find((b) => b.code === "TP1");
    const tp2 = buildings.find((b) => b.code === "TP2");
    assert(ub && tp1 && tp2, "seed buildings UB/TP1/TP2 required");

    const [ubCount, tp1Active, tp2Count] = await Promise.all([
      prisma.classroom.count({ where: { buildingId: ub.id, isActive: true } }),
      prisma.classroom.count({ where: { buildingId: tp1.id, isActive: true } }),
      prisma.classroom.count({ where: { buildingId: tp2.id, isActive: true } }),
    ]);
    assert(ubCount === 77, `UB active classrooms expected 77, got ${ubCount}`);
    assert(tp2Count === 78, `TP2 active classrooms expected 78, got ${tp2Count}`);
    assert(tp1Active === 0, `TP1 active classrooms expected 0, got ${tp1Active}`);
    console.log("ok  seeded counts match owner inventory; TP1 has no active rooms");

    const ub12 = ub.floors.find((f) => f.floorNumber === 12);
    const ub5 = ub.floors.find((f) => f.floorNumber === 5);
    const tp2f2 = tp2.floors.find((f) => f.floorNumber === 2);
    const tp1f1 = tp1.floors.find((f) => f.floorNumber === 1);
    assert(ub12 && ub5 && tp2f2 && tp1f1, "expected floors missing");

    const room1205 = await prisma.classroom.findFirst({
      where: {
        buildingId: ub.id,
        floorId: ub12.id,
        roomNumber: "1205",
        isActive: true,
      },
    });
    const room504Ub5 = await prisma.classroom.findFirst({
      where: {
        buildingId: ub.id,
        floorId: ub5.id,
        roomNumber: "504",
        isActive: true,
      },
    });
    const room204 = await prisma.classroom.findFirst({
      where: {
        buildingId: tp2.id,
        floorId: tp2f2.id,
        roomNumber: "204",
        isActive: true,
      },
    });
    assert(room1205, "UB 1205 (floor 12) must exist");
    assert(room504Ub5, "UB 504 (floor 5) must exist");
    assert(room204, "TP2 204 (floor 2) must exist");

    const ghost504on12 = await prisma.classroom.findFirst({
      where: {
        buildingId: ub.id,
        floorId: ub12.id,
        roomNumber: "504",
      },
    });
    assert(!ghost504on12, "UB floor 12 must not have room 504");
    console.log("ok  1205 on UB12, 504 on UB5, no 504 on UB12");

    section("lookupActiveClassroom — cross-floor / invalid");
    const reject504 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room504Ub5.id,
    });
    assert(!reject504.ok, "UB Floor 12 + classroom 504 (floor 5 id) must be rejected");
    console.log("ok  UB Floor 12 + 504 (wrong floor id) rejected");

    const rejectMissing = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: "not-a-real-classroom",
    });
    assert(!rejectMissing.ok, "unknown classroom id must be rejected");
    console.log("ok  unknown classroom id rejected");

    const rejectEmpty = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: "   ",
    });
    assert(!rejectEmpty.ok, "blank classroom id must be rejected");
    console.log("ok  blank classroom id rejected");

    const accept1205 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room1205.id,
    });
    assert(accept1205.ok && accept1205.classroom.roomNumber === "1205", "UB 1205 must be accepted");
    console.log("ok  UB Floor 12 + 1205 accepted");

    const acceptTp2 = await lookupActiveClassroom({
      buildingId: tp2.id,
      floorId: tp2f2.id,
      classroomId: room204.id,
    });
    assert(acceptTp2.ok && acceptTp2.classroom.roomNumber === "204", "TP2 204 must be accepted");
    console.log("ok  TP2 Floor 2 + 204 accepted");

    section("submit path cannot persist UB12/504");
    const reportsBefore = await prisma.freeReport.count();
    const classroomsBefore = await prisma.classroom.count({
      where: { buildingId: ub.id, floorId: ub12.id, isActive: true },
    });

    const cross = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room504Ub5.id,
    });
    assert(!cross.ok, "lookup must block submit of UB12 + 504");

    const reportsAfter = await prisma.freeReport.count();
    const classroomsAfter = await prisma.classroom.count({
      where: { buildingId: ub.id, floorId: ub12.id, isActive: true },
    });
    assert(reportsAfter === reportsBefore, "rejected lookup must not insert free_reports");
    assert(classroomsAfter === classroomsBefore, "rejected lookup must not insert classrooms");
    assert(classroomsAfter === 7, `UB12 classroom count expected 7, got ${classroomsAfter}`);
    console.log("ok  no classroom/report rows created for UB Floor 12 + 504");

    section("Finder coverage — TP1 inventory gap");
    const tp1Coverage = await queryFinderCoverage({
      buildingId: tp1.id,
      floorId: tp1f1.id,
      timeSlotId: null,
    });
    assert(tp1Coverage.activeClassroomCount === 0, "TP1 floor should have 0 classrooms");
    assert(tp1Coverage.kind === "inventory_gap", `expected inventory_gap, got ${tp1Coverage.kind}`);
    console.log("ok  TP1 coverage is inventory_gap");

    const ub12Coverage = await queryFinderCoverage({
      buildingId: ub.id,
      floorId: ub12.id,
      timeSlotId: null,
    });
    assert(ub12Coverage.activeClassroomCount === 7, `UB12 rooms expected 7, got ${ub12Coverage.activeClassroomCount}`);
    assert(
      ub12Coverage.kind === "insufficient_reports" || ub12Coverage.kind === "none_free",
      `UB12 should not be inventory_gap, got ${ub12Coverage.kind}`,
    );
    console.log(`ok  UB12 coverage kind=${ub12Coverage.kind} classrooms=7`);

    console.log("\nV2.1 classroom integrity tests passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

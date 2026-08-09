/**
 * Phase 7 smoke test — duplicate + 2-strike auto-hide (run: npx tsx scripts/test-phase7-report.mjs)
 * Temporary verification script; safe to delete after Phase 7 sign-off.
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function ensureFreeReport() {
  const building = await prisma.building.findFirst({ where: { code: "UB" } });
  if (!building) throw new Error("No UB building — run seed");
  const floor = await prisma.floor.findFirst({
    where: { buildingId: building.id, floorNumber: 5 },
  });
  if (!floor) throw new Error("No floor 5");
  const slot = await prisma.timeSlot.findFirst({
    orderBy: { slotOrder: "asc" },
  });
  if (!slot) throw new Error("No slots");

  const classroom = await prisma.classroom.upsert({
    where: {
      buildingId_floorId_roomNumber: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber: "P7TEST",
      },
    },
    create: {
      buildingId: building.id,
      floorId: floor.id,
      roomNumber: "P7TEST",
    },
    update: {},
  });

  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const reportDate = new Date(`${ymd}T00:00:00.000Z`);

  const existing = await prisma.freeReport.findUnique({
    where: {
      classroomId_timeSlotId_reportDate: {
        classroomId: classroom.id,
        timeSlotId: slot.id,
        reportDate,
      },
    },
  });
  if (existing) {
    await prisma.occupiedReport.deleteMany({
      where: { freeReportId: existing.id },
    });
    await prisma.freeReport.update({
      where: { id: existing.id },
      data: { status: "unverified", confirmationCount: 1, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    return existing.id;
  }

  const created = await prisma.freeReport.create({
    data: {
      classroomId: classroom.id,
      timeSlotId: slot.id,
      reportDate,
      contributorToken: randomUUID(),
      status: "unverified",
      confirmationCount: 1,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  return created.id;
}

async function strike(
  freeReportId: string,
  token: string,
  reason: "occupied" | "wrong_info" | "class_in_progress",
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.occupiedReport.findUnique({
      where: {
        freeReportId_reporterToken: {
          freeReportId,
          reporterToken: token,
        },
      },
    });
    if (existing) {
      const strikeCount = await tx.occupiedReport.count({
        where: { freeReportId },
      });
      return {
        kind: "already_reported" as const,
        strikeCount,
        hidden: strikeCount >= 2,
      };
    }
    await tx.occupiedReport.create({
      data: { freeReportId, reporterToken: token, reason },
    });
    const strikeCount = await tx.occupiedReport.count({
      where: { freeReportId },
    });
    let hidden = false;
    if (strikeCount >= 2) {
      await tx.freeReport.update({
        where: { id: freeReportId },
        data: { status: "hidden" },
      });
      hidden = true;
    }
    return { kind: "created" as const, strikeCount, hidden };
  });
}

async function main() {
  const freeReportId = await ensureFreeReport();
  console.log("freeReportId", freeReportId);

  const tokenA = randomUUID();
  const tokenB = randomUUID();

  const r1 = await strike(freeReportId, tokenA, "occupied");
  console.log("strike1 (tokenA):", r1);
  if (r1.kind !== "created" || r1.strikeCount !== 1 || r1.hidden) {
    throw new Error("Expected first strike to create with count=1, hidden=false");
  }

  const r1dup = await strike(freeReportId, tokenA, "wrong_info");
  console.log("strike1 duplicate (tokenA):", r1dup);
  if (r1dup.kind !== "already_reported" || r1dup.strikeCount !== 1) {
    throw new Error("Expected duplicate from same token");
  }

  const after1 = await prisma.freeReport.findUnique({
    where: { id: freeReportId },
  });
  console.log("status after 1 unique strike:", after1?.status);
  if (after1?.status !== "unverified") {
    throw new Error("Status should still be unverified after 1 strike");
  }

  const r2 = await strike(freeReportId, tokenB, "class_in_progress");
  console.log("strike2 (tokenB):", r2);
  if (r2.kind !== "created" || r2.strikeCount !== 2 || !r2.hidden) {
    throw new Error("Expected second strike to hide");
  }

  const after2 = await prisma.freeReport.findUnique({
    where: { id: freeReportId },
  });
  console.log("status after 2 unique strikes:", after2?.status);
  if (after2?.status !== "hidden") {
    throw new Error("Expected status=hidden");
  }

  const inView = await prisma.$queryRawUnsafe(
    `SELECT free_report_id FROM active_free_classrooms WHERE free_report_id = $1`,
    freeReportId,
  );
  console.log("still in active view?", inView);
  if (Array.isArray(inView) && inView.length > 0) {
    throw new Error("Hidden report should not appear in active_free_classrooms");
  }

  try {
    await prisma.occupiedReport.create({
      data: {
        freeReportId,
        reporterToken: tokenA,
        reason: "duplicate",
      },
    });
    throw new Error("duplicate insert should have failed");
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "unknown";
    console.log("duplicate constraint OK:", code);
    if (code !== "P2002") throw e;
  }

  console.log("Phase 7 DB smoke tests PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

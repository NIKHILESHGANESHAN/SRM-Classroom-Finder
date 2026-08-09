/**
 * Phase 8 smoke: seed an already-past expires_at report, call cron, verify.
 * Usage: npx tsx scripts/test-phase8-expire.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

function loadCronSecret(): string {
  const fromEnv = process.env.CRON_SECRET;
  if (fromEnv) return fromEnv;
  const env = readFileSync(".env", "utf8");
  const match = env.match(/^CRON_SECRET=["']?([^"'\n]+)["']?/m);
  if (!match) throw new Error("CRON_SECRET missing from .env");
  return match[1];
}

async function seedPastDueReport(): Promise<string> {
  const building = await prisma.building.findFirst({ where: { code: "UB" } });
  if (!building) throw new Error("seed buildings first");
  const floor = await prisma.floor.findFirst({
    where: { buildingId: building.id, floorNumber: 8 },
  });
  if (!floor) throw new Error("missing floor");
  const slot = await prisma.timeSlot.findFirst({
    orderBy: { slotOrder: "desc" },
  });
  if (!slot) throw new Error("missing slot");

  const classroom = await prisma.classroom.upsert({
    where: {
      buildingId_floorId_roomNumber: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber: "P8EXP",
      },
    },
    create: {
      buildingId: building.id,
      floorId: floor.id,
      roomNumber: "P8EXP",
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

  // Past wall-clock so expires_at < NOW() regardless of TZ quirks
  const pastExpires = new Date("2000-01-01T00:00:00.000Z");

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
      data: {
        status: "unverified",
        expiresAt: pastExpires,
        confirmationCount: 1,
      },
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
      expiresAt: pastExpires,
    },
  });
  return created.id;
}

async function main() {
  const base = process.env.CRON_BASE_URL ?? "http://localhost:3002";
  const secret = loadCronSecret();
  const id = await seedPastDueReport();
  console.log("seeded past-due free_report", id);

  const before = await prisma.freeReport.findUnique({
    where: { id },
    select: { status: true, expiresAt: true },
  });
  console.log("before", before);

  // Unauthorized
  const unauth = await fetch(`${base}/api/cron/expire`, {
    headers: { Authorization: "Bearer wrong-secret" },
  });
  console.log("unauthorized status", unauth.status, await unauth.json());
  if (unauth.status !== 401) throw new Error("expected 401 for bad secret");

  // Authorized
  const ok = await fetch(`${base}/api/cron/expire`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await ok.json();
  console.log("authorized status", ok.status, body);
  if (ok.status !== 200 || !body.ok) throw new Error("expected 200 ok");
  if (typeof body.expiredCount !== "number") {
    throw new Error("missing expiredCount");
  }
  if (body.expiredCount < 1) {
    throw new Error("expected at least 1 expired row");
  }

  const after = await prisma.freeReport.findUnique({
    where: { id },
    select: { id: true, status: true, expiresAt: true, createdAt: true },
  });
  console.log("after (still in DB)", after);
  if (after?.status !== "expired") {
    throw new Error(`expected status=expired, got ${after?.status}`);
  }

  const inView = await prisma.$queryRawUnsafe(
    `SELECT free_report_id FROM active_free_classrooms WHERE free_report_id = $1`,
    id,
  );
  console.log("in active view?", inView);
  if (Array.isArray(inView) && inView.length > 0) {
    throw new Error("expired report should not appear in active_free_classrooms");
  }

  // Idempotent second run
  const again = await fetch(`${base}/api/cron/expire`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const againBody = await again.json();
  console.log("second run", again.status, againBody);

  console.log("Phase 8 expire smoke tests PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

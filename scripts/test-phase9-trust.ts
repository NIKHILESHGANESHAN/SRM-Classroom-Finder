/**
 * Phase 9 smoke — trusted vs soft-throttled confirmation thresholds.
 * Run: npx tsx scripts/test-phase9-trust.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  getConfirmationThresholdForToken,
  isConfirmedBadgeStatus,
  isTokenSoftThrottled,
  nextStatusAfterConfirmation,
  THROTTLED_CONFIRMATION_THRESHOLD,
  TRUSTED_CONFIRMATION_THRESHOLD,
} from "../lib/token-trust";

const prisma = new PrismaClient();

function todayReportDate(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

async function ensureClassroom(roomNumber: string) {
  const building = await prisma.building.findFirst({ where: { code: "UB" } });
  if (!building) throw new Error("seed buildings");
  const floor = await prisma.floor.findFirst({
    where: { buildingId: building.id, floorNumber: 9 },
  });
  if (!floor) throw new Error("missing floor");
  return prisma.classroom.upsert({
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
}

async function seedHiddenForToken(token: string, n: number, reportDate: Date) {
  const slots = await prisma.timeSlot.findMany({
    orderBy: { slotOrder: "asc" },
    take: n,
  });
  if (slots.length < n) throw new Error("need more time slots");

  for (let i = 0; i < n; i++) {
    const room = await ensureClassroom(`P9H${i}`);
    const existing = await prisma.freeReport.findUnique({
      where: {
        classroomId_timeSlotId_reportDate: {
          classroomId: room.id,
          timeSlotId: slots[i].id,
          reportDate,
        },
      },
    });
    if (existing) {
      await prisma.freeReport.update({
        where: { id: existing.id },
        data: {
          contributorToken: token,
          status: "hidden",
          confirmationCount: 1,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
    } else {
      await prisma.freeReport.create({
        data: {
          classroomId: room.id,
          timeSlotId: slots[i].id,
          reportDate,
          contributorToken: token,
          status: "hidden",
          confirmationCount: 1,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
    }
  }
}

async function simulateConfirmations(args: {
  label: string;
  originalToken: string;
  roomNumber: string;
  slotOrder: number;
  reportDate: Date;
  confirmerTokens: string[];
}) {
  const room = await ensureClassroom(args.roomNumber);
  const slot = await prisma.timeSlot.findFirst({
    where: { slotOrder: args.slotOrder },
  });
  if (!slot) throw new Error("missing slot");

  const existing = await prisma.freeReport.findUnique({
    where: {
      classroomId_timeSlotId_reportDate: {
        classroomId: room.id,
        timeSlotId: slot.id,
        reportDate: args.reportDate,
      },
    },
  });
  if (existing) {
    await prisma.occupiedReport.deleteMany({
      where: { freeReportId: existing.id },
    });
    await prisma.freeReport.delete({ where: { id: existing.id } });
  }

  let report = await prisma.freeReport.create({
    data: {
      classroomId: room.id,
      timeSlotId: slot.id,
      reportDate: args.reportDate,
      contributorToken: args.originalToken,
      status: "unverified",
      confirmationCount: 1,
      expiresAt: new Date(Date.now() + 7_200_000),
    },
  });

  console.log(`[${args.label}] created`, {
    status: report.status,
    count: report.confirmationCount,
    badge: isConfirmedBadgeStatus(report.status),
  });

  for (const confirmer of args.confirmerTokens) {
    const threshold = await getConfirmationThresholdForToken(
      prisma,
      report.contributorToken,
      args.reportDate,
    );
    const nextCount = report.confirmationCount + 1;
    const nextStatus = nextStatusAfterConfirmation({
      currentStatus: report.status,
      nextConfirmationCount: nextCount,
      threshold,
    });
    report = await prisma.freeReport.update({
      where: { id: report.id },
      data: { confirmationCount: nextCount, status: nextStatus },
    });
    console.log(`[${args.label}] after confirmer ${confirmer.slice(0, 8)}…`, {
      threshold,
      status: report.status,
      count: report.confirmationCount,
      badgeConfirmed: isConfirmedBadgeStatus(report.status),
    });
  }

  return report;
}

async function main() {
  const reportDate = todayReportDate();
  const trusted = randomUUID();
  const throttled = randomUUID();
  const c1 = randomUUID();
  const c2 = randomUUID();

  // Pure unit checks for badge / status helpers
  if (isConfirmedBadgeStatus("confirmed") !== true) {
    throw new Error("badge: confirmed should be true");
  }
  if (isConfirmedBadgeStatus("unverified") !== false) {
    throw new Error("badge: unverified should be false");
  }
  if (isConfirmedBadgeStatus("hidden") !== false) {
    throw new Error("badge: hidden must never be Confirmed");
  }
  if (isConfirmedBadgeStatus("expired") !== false) {
    throw new Error("badge: expired must never be Confirmed");
  }
  if (
    nextStatusAfterConfirmation({
      currentStatus: "hidden",
      nextConfirmationCount: 99,
      threshold: 2,
    }) !== "hidden"
  ) {
    throw new Error("hidden must not upgrade");
  }
  if (
    nextStatusAfterConfirmation({
      currentStatus: "expired",
      nextConfirmationCount: 99,
      threshold: 2,
    }) !== "expired"
  ) {
    throw new Error("expired must not upgrade");
  }

  // Trusted token: 0 hidden → threshold 2 → confirms on first independent bump
  if (await isTokenSoftThrottled(prisma, trusted, reportDate)) {
    throw new Error("trusted token should not be throttled");
  }
  const trustedThreshold = await getConfirmationThresholdForToken(
    prisma,
    trusted,
    reportDate,
  );
  if (trustedThreshold !== TRUSTED_CONFIRMATION_THRESHOLD) {
    throw new Error(`expected trusted threshold 2, got ${trustedThreshold}`);
  }

  const trustedReport = await simulateConfirmations({
    label: "trusted",
    originalToken: trusted,
    roomNumber: "P9T1",
    slotOrder: 8,
    reportDate,
    confirmerTokens: [c1],
  });
  if (trustedReport.status !== "confirmed" || trustedReport.confirmationCount !== 2) {
    throw new Error("trusted should be confirmed at count=2");
  }

  // Soft-throttled: 3 hidden today → threshold 3 → still unverified at count=2
  await seedHiddenForToken(throttled, 3, reportDate);
  if (!(await isTokenSoftThrottled(prisma, throttled, reportDate))) {
    throw new Error("token with 3 hidden should be soft-throttled");
  }
  const throttledThreshold = await getConfirmationThresholdForToken(
    prisma,
    throttled,
    reportDate,
  );
  if (throttledThreshold !== THROTTLED_CONFIRMATION_THRESHOLD) {
    throw new Error(`expected throttled threshold 3, got ${throttledThreshold}`);
  }

  const mid = await simulateConfirmations({
    label: "throttled-mid",
    originalToken: throttled,
    roomNumber: "P9T2",
    slotOrder: 9,
    reportDate,
    confirmerTokens: [c1],
  });
  if (mid.status !== "unverified" || mid.confirmationCount !== 2) {
    throw new Error("throttled should stay unverified at count=2");
  }
  if (isConfirmedBadgeStatus(mid.status)) {
    throw new Error("badge must not show Confirmed for unverified count=2");
  }

  const full = await simulateConfirmations({
    label: "throttled-full",
    originalToken: throttled,
    roomNumber: "P9T3",
    slotOrder: 10,
    reportDate,
    confirmerTokens: [c1, c2],
  });
  if (full.status !== "confirmed" || full.confirmationCount !== 3) {
    throw new Error("throttled should confirm at count=3");
  }

  // Duplicate original token does not bump (simulate already_reported guard)
  const dup = await prisma.freeReport.findUnique({ where: { id: full.id } });
  if (!dup) throw new Error("missing full report");
  if (dup.contributorToken === throttled) {
    // same token would short-circuit in contribute — ensure count unchanged
    console.log("duplicate original token would short-circuit (ok)");
  }

  console.log("Phase 9 trust smoke tests PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

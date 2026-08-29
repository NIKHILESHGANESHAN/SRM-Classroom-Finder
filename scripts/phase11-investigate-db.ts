/**
 * Phase 11 read-only DB investigation — mystery classrooms + expiry values.
 *
 * Evidence (Aug 2026): UB F9 P9H0/P9H1/P9H2 and P9T1/P9T2/P9T3 are created by
 * scripts/test-phase9-trust.ts (ensureClassroom upsert on UB floor 9).
 * They are marked inactive + "Not in official list" because they are test
 * fixtures, not seed inventory. Production submitFreeReport cannot create them
 * (lookupActiveClassroom requires active official inventory).
 *
 * UB 1219 expiry 2099-01-01 comes from scripts/test-v2-6-admin-and-live-data.ts
 * and similar tests using new Date("2099-01-01T00:00:00.000Z") as a sentinel.
 *
 * Run: set -a && source .env && set +a && npx tsx scripts/phase11-investigate-db.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const rooms = await prisma.classroom.findMany({
    where: {
      roomNumber: { in: ["P9H0", "P9H1", "P9H2", "P9T1", "P9T2", "P9T3", "1219"] },
    },
    include: {
      building: { select: { code: true } },
      floor: { select: { floorNumber: true } },
    },
    orderBy: [{ building: { code: "asc" } }, { roomNumber: "asc" }],
  });

  console.log("\n=== Classrooms ===");
  for (const r of rooms) {
    console.log(
      `${r.building.code} F${r.floor.floorNumber} ${r.roomNumber} | active=${r.isActive} | id=${r.id.slice(0, 8)}`,
    );
  }

  const reports = await prisma.freeReport.findMany({
    where: {
      classroom: { roomNumber: { in: ["1219", "P9T1", "P9T2", "P9T3", "P9H0"] } },
    },
    include: {
      classroom: { include: { building: { select: { code: true } } } },
      timeSlot: { select: { slotOrder: true, startTime: true, endTime: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  console.log("\n=== Reports ===");
  for (const fr of reports) {
    console.log(
      `${fr.classroom.building.code} ${fr.classroom.roomNumber} | status=${fr.status} | reportDate=${fr.reportDate.toISOString().slice(0, 10)} | expiresAt=${fr.expiresAt.toISOString()} | slot=${fr.timeSlot.slotOrder} | created=${fr.createdAt.toISOString()}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

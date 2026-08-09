/**
 * Prisma seed — reference / dimension data only (Phase 3).
 *
 * Seeds:
 *   - buildings (UB, TP1, TP2)
 *   - floors (per-building ranges from the project spec)
 *   - time_slots (slots 1–10 with official start/end times)
 *
 * Idempotent: safe to run repeatedly via upserts on natural keys
 * (building.code, floor.(buildingId, floorNumber), time_slot.slotOrder).
 *
 * Run: `npx prisma db seed` or `npm run db:seed`
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Spec buildings — rows, not enums, so a 4th building is one INSERT later. */
const BUILDINGS = [
  {
    code: "UB",
    name: "University Building",
    floors: [5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    code: "TP1",
    name: "Tech Park 1",
    floors: Array.from({ length: 15 }, (_, i) => i + 1), // 1–15
  },
  {
    code: "TP2",
    name: "Tech Park 2",
    floors: Array.from({ length: 12 }, (_, i) => i + 2), // 2–13
  },
] as const;

/**
 * Official SRM KTR period boundaries (slot_order → start/end).
 * Times are wall-clock on campus; stored as PostgreSQL TIME via Prisma @db.Time.
 */
const TIME_SLOTS: ReadonlyArray<{
  slotOrder: number;
  start: [number, number];
  end: [number, number];
}> = [
  { slotOrder: 1, start: [8, 0], end: [8, 50] },
  { slotOrder: 2, start: [8, 50], end: [9, 40] },
  { slotOrder: 3, start: [9, 45], end: [10, 35] },
  { slotOrder: 4, start: [10, 40], end: [11, 30] },
  { slotOrder: 5, start: [11, 30], end: [12, 25] },
  { slotOrder: 6, start: [12, 30], end: [13, 20] },
  { slotOrder: 7, start: [13, 25], end: [14, 15] },
  { slotOrder: 8, start: [14, 20], end: [15, 10] },
  { slotOrder: 9, start: [15, 10], end: [16, 0] },
  { slotOrder: 10, start: [16, 0], end: [16, 50] },
];

/**
 * Prisma maps @db.Time from a Date's UTC time-of-day.
 * Epoch date is arbitrary — only HH:MM:SS is persisted.
 */
function atTime(hours: number, minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

async function seedBuildingsAndFloors(): Promise<void> {
  for (const building of BUILDINGS) {
    const row = await prisma.building.upsert({
      where: { code: building.code },
      create: { code: building.code, name: building.name },
      update: { name: building.name },
    });

    for (const floorNumber of building.floors) {
      await prisma.floor.upsert({
        where: {
          buildingId_floorNumber: {
            buildingId: row.id,
            floorNumber,
          },
        },
        create: {
          buildingId: row.id,
          floorNumber,
        },
        // Idempotent no-op — floor_number is the identity for this building
        update: {},
      });
    }

    console.log(
      `✓ Building ${building.code} (${building.name}) — ${building.floors.length} floors`,
    );
  }
}

async function seedTimeSlots(): Promise<void> {
  for (const slot of TIME_SLOTS) {
    const [sh, sm] = slot.start;
    const [eh, em] = slot.end;

    await prisma.timeSlot.upsert({
      where: { slotOrder: slot.slotOrder },
      create: {
        slotOrder: slot.slotOrder,
        startTime: atTime(sh, sm),
        endTime: atTime(eh, em),
      },
      update: {
        startTime: atTime(sh, sm),
        endTime: atTime(eh, em),
      },
    });
  }

  console.log(`✓ Time slots 1–${TIME_SLOTS.length} upserted`);
}

async function printSummary(): Promise<void> {
  const [buildingCount, floorCount, slotCount] = await Promise.all([
    prisma.building.count(),
    prisma.floor.count(),
    prisma.timeSlot.count(),
  ]);

  const floorsByBuilding = await prisma.building.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      _count: { select: { floors: true } },
      floors: {
        orderBy: { floorNumber: "asc" },
        select: { floorNumber: true },
      },
    },
  });

  console.log("\n── Seed summary ──");
  console.log(`buildings:   ${buildingCount}`);
  console.log(`floors:      ${floorCount}`);
  console.log(`time_slots:  ${slotCount}`);

  for (const b of floorsByBuilding) {
    const nums = b.floors.map((f) => f.floorNumber).join(", ");
    console.log(`  ${b.code}: floors [${nums}] (${b._count.floors})`);
  }
}

async function main(): Promise<void> {
  console.log("Seeding SRM KTR Classroom Finder reference data…\n");
  await seedBuildingsAndFloors();
  await seedTimeSlots();
  await printSummary();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

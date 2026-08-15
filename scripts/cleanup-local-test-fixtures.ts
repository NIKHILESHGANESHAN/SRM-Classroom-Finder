/**
 * LOCAL DEVELOPMENT ONLY
 *
 * Removes leftover V2.x test classrooms (V22-…, V23-…, P7…, P8E…, QA…)
 * created by automated tests. Cascades to free_reports / occupied / events.
 *
 * NEVER run against production.
 *
 *   npx tsx scripts/cleanup-local-test-fixtures.ts --yes
 *
 * Official UB/TP2 inventory is never deleted.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function isTestFixtureRoom(roomNumber: string): boolean {
  return /^(V22-|V23-|QA|P7T|P8E|P7TEST|P8EXP)/i.test(roomNumber.trim());
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("Refusing: production environment.");
    process.exit(1);
  }
  if (!isLocalDatabaseUrl(url)) {
    console.error("Refusing: DATABASE_URL is not localhost. This script is local-dev only.");
    process.exit(1);
  }
  if (!process.argv.includes("--yes")) {
    console.error("Dry run. Pass --yes to delete local test-fixture classrooms.");
    const rows = await prisma.classroom.findMany({
      select: { roomNumber: true, building: { select: { code: true } } },
    });
    const fixtures = rows.filter((r) => isTestFixtureRoom(r.roomNumber));
    console.log(`Would delete ${fixtures.length} fixture classrooms.`);
    process.exit(0);
  }

  const rows = await prisma.classroom.findMany({
    select: {
      id: true,
      roomNumber: true,
      building: { select: { code: true } },
    },
  });
  const fixtures = rows.filter((r) => isTestFixtureRoom(r.roomNumber));
  if (fixtures.length === 0) {
    console.log("No local test-fixture classrooms found.");
    return;
  }

  const ids = fixtures.map((r) => r.id);
  const deleted = await prisma.classroom.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${deleted.count} local test-fixture classrooms.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

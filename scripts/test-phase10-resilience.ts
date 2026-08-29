/**
 * Phase 10 — database connectivity error classification (no DB required).
 * Run: npx tsx scripts/test-phase10-resilience.ts
 */

import { Prisma } from "@prisma/client";
import {
  FINDER_REFRESH_FAILED_MESSAGE,
  isDatabaseConnectivityError,
  LIVE_DATA_UNAVAILABLE_MESSAGE,
  sanitizeErrorForLog,
} from "../lib/db-errors";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  section("Prisma connectivity codes");
  for (const code of ["P1001", "P1002", "P1008", "P1017"]) {
    const err = new Prisma.PrismaClientKnownRequestError("test", {
      code,
      clientVersion: "test",
    });
    assert(isDatabaseConnectivityError(err), code);
  }
  const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });
  assert(!isDatabaseConnectivityError(p2002), "P2002 is not connectivity");
  console.log("ok  known request codes");

  section("Message heuristics");
  assert(
    isDatabaseConnectivityError(
      new Error(
        "Can't reach database server at `ep-example-pooler.aws.neon.tech:5432`",
      ),
    ),
    "neon host message",
  );
  assert(
    !isDatabaseConnectivityError(new Error("Unique constraint failed")),
    "business rule",
  );
  console.log("ok  message classification");

  section("Sanitize logs");
  const sanitized = sanitizeErrorForLog(
    new Error(
      "Can't reach database server at ep-super-queen-azeb5ty7-pooler.c-3.ap-southeast-1.aws.neon.tech:5432",
    ),
  );
  assert(!sanitized.includes("neon.tech"), "hostname stripped");
  assert(!sanitized.includes("ep-super"), "pooler id stripped");
  console.log("ok  sanitizeErrorForLog");

  section("Public copy — no database jargon");
  assert(
    !LIVE_DATA_UNAVAILABLE_MESSAGE.toLowerCase().includes("database"),
    "help message",
  );
  assert(
    !LIVE_DATA_UNAVAILABLE_MESSAGE.toLowerCase().includes("prisma"),
    "help no prisma",
  );
  assert(
    !FINDER_REFRESH_FAILED_MESSAGE.toLowerCase().includes("database"),
    "finder poll message",
  );
  console.log("ok  student-facing strings");

  console.log("\nAll Phase 10 resilience unit checks passed.");
}

main();

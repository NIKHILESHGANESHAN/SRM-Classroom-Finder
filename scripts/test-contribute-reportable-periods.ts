/**
 * Contributor reportable-period regression tests (deterministic, no live clock).
 * Run: npx tsx scripts/test-contribute-reportable-periods.ts
 */

import { prisma } from "@/lib/prisma";
import {
  CAMPUS_TIMEZONE,
  getCurrentSlotId,
  getNowMinutesInTz,
  isSlotSelectable,
  SLOT_GRACE_MINUTES,
  timeToMinutes,
  type SlotTimeFields,
} from "@/lib/slots";
import {
  isAfterLastReportablePeriod,
  isBeforeFirstReportablePeriod,
} from "@/lib/finder-ui";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

/** 09:04 IST on 2026-08-26 as a UTC instant. */
const AT_904_IST_2026_08_26 = new Date("2026-08-26T03:34:00.000Z");

/** Official seed slot 2: 08:50–09:40 */
const SLOT_2 = { startMinutes: 8 * 60 + 50, endMinutes: 9 * 60 + 40 };

/** Official seed slot 10: 16:00–16:50 */
const SLOT_10 = { startMinutes: 16 * 60, endMinutes: 16 * 60 + 50 };

function istDate(hour: number, minute: number): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  // Asia/Kolkata is UTC+5:30 — build UTC instant for that wall clock
  const utcHour = hour - 5;
  const utcMinute = minute - 30;
  const d = new Date(
    `2026-08-26T${pad(utcHour < 0 ? utcHour + 24 : utcHour)}:${pad(utcMinute < 0 ? utcMinute + 60 : utcMinute)}:00.000Z`,
  );
  if (utcMinute < 0) d.setUTCMinutes(d.getUTCMinutes() - 60);
  if (utcHour < 0) d.setUTCHours(d.getUTCHours() - 24);
  return d;
}

function minutesAt(date: Date): number {
  return getNowMinutesInTz(date, CAMPUS_TIMEZONE);
}

async function loadSlotFields(): Promise<SlotTimeFields[]> {
  const rows = await prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } });
  return rows.map((s) => ({
    id: s.id,
    slotOrder: s.slotOrder,
    startMinutes: timeToMinutes(s.startTime),
    endMinutes: timeToMinutes(s.endTime),
  }));
}

function simulateCachedTimeRows(
  rows: Awaited<ReturnType<typeof prisma.timeSlot.findMany>>,
) {
  return JSON.parse(JSON.stringify(rows)) as typeof rows;
}

async function main() {
  console.log("\n=== Campus timezone helpers ===");
  assert(minutesAt(AT_904_IST_2026_08_26) === 9 * 60 + 4, "09:04 IST → 544 minutes");
  console.log("ok  09:04 Asia/Kolkata on 2026-08-26");

  // UTC server clock ≠ IST wall clock — same instant must agree
  const utcWall904 = new Date("2026-08-26T09:04:00.000Z");
  assert(
    minutesAt(utcWall904) !== minutesAt(AT_904_IST_2026_08_26),
    "UTC 09:04 Z is not campus 09:04",
  );
  assert(
    minutesAt(AT_904_IST_2026_08_26) === 544,
    "IST helper ignores server TZ",
  );
  console.log("ok  server TZ vs Asia/Kolkata");

  console.log("\n=== isSlotSelectable (±5 min grace) ===");
  assert(
    isSlotSelectable(SLOT_2, SLOT_2.startMinutes),
    "exactly at slot start",
  );
  assert(isSlotSelectable(SLOT_2, SLOT_2.endMinutes), "exactly at slot end");
  assert(
    isSlotSelectable(SLOT_2, SLOT_2.startMinutes - SLOT_GRACE_MINUTES),
    "grace −5 at start",
  );
  assert(
    !isSlotSelectable(
      SLOT_2,
      SLOT_2.startMinutes - SLOT_GRACE_MINUTES - 1,
    ),
    "one minute before grace window",
  );
  assert(
    isSlotSelectable(SLOT_2, SLOT_2.endMinutes + SLOT_GRACE_MINUTES),
    "grace +5 at end",
  );
  assert(
    !isSlotSelectable(
      SLOT_2,
      SLOT_2.endMinutes + SLOT_GRACE_MINUTES + 1,
    ),
    "one minute after grace window",
  );
  assert(
    isSlotSelectable(SLOT_2, minutesAt(AT_904_IST_2026_08_26)),
    "09:04 IST inside slot 2",
  );
  assert(
    !isSlotSelectable(SLOT_2, 7 * 60),
    "clearly outside slot 2 (07:00)",
  );
  console.log("ok  grace boundaries and 09:04 IST");

  console.log("\n=== After-hours boundaries ===");
  const slots = await loadSlotFields();
  const lastEnd =
    [...slots].sort((a, b) => b.slotOrder - a.slotOrder)[0]?.endMinutes ?? 0;
  assert(
    !isAfterLastReportablePeriod(slots, lastEnd + SLOT_GRACE_MINUTES),
    "still within final grace",
  );
  assert(
    isAfterLastReportablePeriod(slots, lastEnd + SLOT_GRACE_MINUTES + 1),
    "after final grace",
  );
  const firstStart =
    [...slots].sort((a, b) => a.slotOrder - b.slotOrder)[0]?.startMinutes ??
    0;
  assert(
    isBeforeFirstReportablePeriod(slots, firstStart - SLOT_GRACE_MINUTES - 1),
    "before first grace",
  );
  console.log("ok  first/last reportable period");

  console.log("\n=== Cached TimeSlot JSON (unstable_cache round-trip) ===");
  const raw = await prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } });
  const cached = simulateCachedTimeRows(raw);
  const cachedFields = cached.map((s) => ({
    id: s.id,
    slotOrder: s.slotOrder,
    startMinutes: timeToMinutes(s.startTime),
    endMinutes: timeToMinutes(s.endTime),
  }));

  for (const f of cachedFields) {
    assert(Number.isFinite(f.startMinutes), `cached start NaN slot ${f.slotOrder}`);
    assert(Number.isFinite(f.endMinutes), `cached end NaN slot ${f.slotOrder}`);
  }

  const now904 = minutesAt(AT_904_IST_2026_08_26);
  const anySelectable = cachedFields.some((f) =>
    isSlotSelectable(f, now904),
  );
  assert(anySelectable, "cached rows → at least one selectable slot at 09:04 IST");

  const currentId = getCurrentSlotId(cachedFields, now904);
  assert(currentId !== null, "cached rows → current slot at 09:04 IST");
  const currentOrder = cachedFields.find((f) => f.id === currentId)?.slotOrder;
  assert(currentOrder === 2, `09:04 IST should be slot 2, got order ${currentOrder}`);
  console.log("ok  ISO time strings from cache deserialize correctly");

  console.log("\nContributor reportable-period tests passed.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

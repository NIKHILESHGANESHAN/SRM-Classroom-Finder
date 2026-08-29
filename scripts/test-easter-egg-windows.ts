/**
 * V4 Easter Egg windows + daily reporting cycle (deterministic, no live clock).
 * Run: npx tsx scripts/test-easter-egg-windows.ts
 */

import {
  DAILY_CYCLE_END_MINUTES,
  getActiveFinderReportDate,
  getEasterEggPhase,
  isContributeEasterEggGateActive,
  isDailyReportingCycleOpen,
  isMorningEasterEgg,
  isReportingAllowed,
  isReportingBlockedByEasterEgg,
  nightEggDismissStorageKey,
  NIGHT_EGG_DISMISS_KEY,
  type EasterEggPhase,
} from "@/lib/easter-egg";
import type { ActiveFreeClassroom } from "@/lib/finder-data";
import { filterRoomsForActiveCycle, finderCoverageUnchanged } from "@/lib/finder-realtime";
import { CAMPUS_TIMEZONE, getNowMinutesInTz } from "@/lib/slots";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

/** Build a UTC instant for a given IST wall clock on 2026-08-26. */
function istInstant(hour: number, minute: number): Date {
  const utcMs = Date.UTC(2026, 7, 26, hour - 5, minute - 30, 0);
  return new Date(utcMs);
}

function minutesAt(date: Date): number {
  return getNowMinutesInTz(date, CAMPUS_TIMEZONE);
}

function phaseAt(hour: number, minute: number): EasterEggPhase {
  return getEasterEggPhase(minutesAt(istInstant(hour, minute)));
}

function mockRoom(reportDate: string, endMinutes: number): ActiveFreeClassroom {
  return {
    freeReportId: `mock-${reportDate}-${endMinutes}`,
    status: "confirmed",
    confirmationCount: 2,
    occupiedStrikeCount: 0,
    createdAt: "2026-08-26T04:00:00.000Z",
    lastVerifiedAt: "2026-08-26T04:00:00.000Z",
    reportDate,
    expiresAt: "2026-08-26T16:50:00.000Z",
    classroomId: "class-1",
    roomNumber: "1205",
    buildingId: "b-1",
    buildingCode: "UB",
    buildingName: "University Block",
    floorId: "f-1",
    floorNumber: 12,
    timeSlotId: "slot-1",
    slotOrder: 1,
    startMinutes: 8 * 60,
    endMinutes,
    slotRangeLabel: "8:00 AM–8:50 AM",
  };
}

function main() {
  console.log("\n=== Easter Egg phase boundaries (IST) ===");

  const cases: Array<[number, number, EasterEggPhase, string]> = [
    [3, 59, "night", "03:59 → Night"],
    [4, 0, "morning", "04:00 → Morning"],
    [7, 50, "morning", "07:50 → Morning"],
    [7, 51, "normal", "07:51 → Normal"],
    [16, 59, "normal", "16:59 → Normal"],
    [17, 0, "evening", "17:00 → Evening"],
    [20, 59, "evening", "20:59 → Evening"],
    [21, 0, "night", "21:00 → Night"],
    [23, 59, "night", "23:59 → Night"],
    [0, 0, "night", "00:00 → Night"],
  ];

  for (const [h, m, expected, label] of cases) {
    assert(phaseAt(h, m) === expected, `${label}: expected ${expected}`);
    console.log(`ok  ${label}`);
  }

  console.log("\n=== Contribute Easter Egg gate (wizard blocked) ===");
  const gateCases: Array<[number, number, boolean, string]> = [
    [4, 0, false, "04:00 → morning, wizard allowed"],
    [7, 50, false, "07:50 → morning, wizard allowed"],
    [7, 51, false, "07:51 → normal, wizard allowed"],
    [17, 0, true, "17:00 → evening, gate only"],
    [20, 59, true, "20:59 → evening, gate only"],
    [21, 0, true, "21:00 → night, gate only"],
    [23, 59, true, "23:59 → night, gate only"],
    [0, 0, true, "00:00 → night, gate only"],
    [3, 59, true, "03:59 → night, gate only"],
  ];

  for (const [h, m, expectedGate, label] of gateCases) {
    const phase = phaseAt(h, m);
    assert(
      isContributeEasterEggGateActive(phase) === expectedGate,
      `${label}: expected gate=${expectedGate}`,
    );
    console.log(`ok  ${label}`);
  }

  console.log("\n=== Reporting restriction ===");
  assert(
    isReportingBlockedByEasterEgg(minutesAt(istInstant(17, 0))),
    "17:00 evening blocks reporting",
  );
  assert(
    isReportingBlockedByEasterEgg(minutesAt(istInstant(21, 0))),
    "21:00 night blocks reporting",
  );
  assert(
    !isReportingBlockedByEasterEgg(minutesAt(istInstant(7, 51))),
    "07:51 normal allows reporting (subject to slots)",
  );
  assert(
    !isReportingBlockedByEasterEgg(minutesAt(istInstant(4, 0))),
    "04:00 morning does not block reporting",
  );
  console.log("ok  evening/night block; morning/normal do not");

  console.log("\n=== Daily reporting cycle ===");
  assert(
    isDailyReportingCycleOpen(minutesAt(istInstant(23, 49))),
    "23:49 cycle open",
  );
  assert(
    !isDailyReportingCycleOpen(minutesAt(istInstant(23, 50))),
    "23:50 cycle ends",
  );
  assert(
    !isDailyReportingCycleOpen(minutesAt(istInstant(23, 59))),
    "23:59 cycle closed",
  );
  assert(
    isDailyReportingCycleOpen(minutesAt(istInstant(0, 0))),
    "00:00 fresh day open",
  );
  assert(
    isDailyReportingCycleOpen(minutesAt(istInstant(0, 1))),
    "00:01 fresh day open",
  );
  assert(DAILY_CYCLE_END_MINUTES === 23 * 60 + 50, "cycle end constant");
  console.log("ok  23:49 open → 23:50 closed → 00:00 fresh");

  console.log("\n=== isReportingAllowed (cycle + easter egg) ===");
  assert(
    !isReportingAllowed(minutesAt(istInstant(17, 0))),
    "17:00 not allowed",
  );
  assert(
    !isReportingAllowed(minutesAt(istInstant(23, 50))),
    "23:50 not allowed (cycle end)",
  );
  assert(
    isReportingAllowed(minutesAt(istInstant(10, 0))),
    "10:00 allowed",
  );
  console.log("ok  combined gate");

  console.log("\n=== Active Finder report date ===");
  assert(
    getActiveFinderReportDate(istInstant(23, 49)) === "2026-08-26",
    "23:49 shows today's reports",
  );
  assert(
    getActiveFinderReportDate(istInstant(23, 50)) === null,
    "23:50 no active Finder date",
  );
  assert(
    getActiveFinderReportDate(istInstant(0, 0)) === "2026-08-26",
    "00:00 fresh day (Aug 26 IST)",
  );
  assert(
    getActiveFinderReportDate(istInstant(0, 1)) === "2026-08-26",
    "00:01 fresh day (Aug 26 IST)",
  );
  console.log("ok  Finder scoped to active cycle date");

  console.log("\n=== Finder room filter (daily cycle) ===");
  const at10am = istInstant(10, 0);
  const todayRoom = mockRoom("2026-08-26", 16 * 60 + 50);
  const yesterdayRoom = mockRoom("2026-08-25", 16 * 60 + 50);
  const expiredToday = mockRoom("2026-08-26", 9 * 60);
  const kept = filterRoomsForActiveCycle(
    [todayRoom, yesterdayRoom, expiredToday],
    at10am,
  );
  assert(kept.length === 1, "only active today room kept");
  assert(kept[0]?.freeReportId === todayRoom.freeReportId, "today room id");
  const lateTodayRoom = mockRoom("2026-08-26", 23 * 60 + 59);
  assert(
    filterRoomsForActiveCycle([lateTodayRoom], istInstant(23, 49)).length === 1,
    "23:49 still shows non-expired current-day reports",
  );
  assert(
    filterRoomsForActiveCycle([todayRoom], istInstant(23, 50)).length === 0,
    "23:50 cycle end clears Finder rooms",
  );
  assert(
    filterRoomsForActiveCycle([yesterdayRoom], istInstant(0, 1)).length === 0,
    "00:01 excludes previous-day reports",
  );
  assert(
    filterRoomsForActiveCycle([yesterdayRoom], istInstant(7, 59)).length === 0,
    "07:59 still excludes previous-day reports",
  );
  const freshMorning = mockRoom("2026-08-26", 16 * 60 + 50);
  assert(
    filterRoomsForActiveCycle([freshMorning], istInstant(0, 1)).length === 1,
    "00:01 shows current-day reports only",
  );
  console.log("ok  stale/expired/previous-day rows excluded");

  console.log("\n=== Morning egg helper ===");
  assert(isMorningEasterEgg(minutesAt(istInstant(4, 0))), "04:00 morning");
  assert(!isMorningEasterEgg(minutesAt(istInstant(7, 51))), "07:51 not morning");
  console.log("ok  isMorningEasterEgg");

  console.log("\n=== Night egg dismiss session key ===");
  const nightLate = nightEggDismissStorageKey(istInstant(22, 0));
  assert(
    nightLate === `${NIGHT_EGG_DISMISS_KEY}:2026-08-26`,
    "22:00 night uses current campus date",
  );
  const nightEarly = nightEggDismissStorageKey(istInstant(2, 0));
  assert(
    nightEarly === `${NIGHT_EGG_DISMISS_KEY}:2026-08-25`,
    "02:00 night uses previous calendar day",
  );
  const nightBoundary = nightEggDismissStorageKey(istInstant(3, 59));
  assert(
    nightBoundary === `${NIGHT_EGG_DISMISS_KEY}:2026-08-25`,
    "03:59 night still previous calendar day",
  );
  const morningAfterNight = nightEggDismissStorageKey(istInstant(4, 0));
  assert(
    morningAfterNight === `${NIGHT_EGG_DISMISS_KEY}:2026-08-26`,
    "04:00 switches to morning phase date (not night dismiss)",
  );
  console.log("ok  night dismiss keys for evening vs early-morning segments");

  console.log("\n=== Finder coverage unchanged helper ===");
  assert(
    finderCoverageUnchanged(
      { kind: "none_free", activeClassroomCount: 10, historicalReportCount: 2 },
      { kind: "none_free", activeClassroomCount: 10, historicalReportCount: 2 },
    ),
    "identical coverage",
  );
  assert(
    !finderCoverageUnchanged(
      { kind: "none_free", activeClassroomCount: 10, historicalReportCount: 2 },
      { kind: "inventory_gap", activeClassroomCount: 10, historicalReportCount: 2 },
    ),
    "kind change detected",
  );
  console.log("ok  finderCoverageUnchanged");

  console.log("\nEaster Egg window tests passed.\n");
}

main();

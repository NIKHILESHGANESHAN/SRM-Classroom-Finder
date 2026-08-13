/**
 * V2.3 Finder real-time / filter tests.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-3-finder-realtime.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { lookupActiveClassroom } from "../lib/classroom-lookup";
import { queryActiveFreeClassrooms, queryFinderCoverage } from "../lib/finder-data";
import type { ActiveFreeClassroom } from "../lib/finder-data";
import {
  ADAPTIVE_POLL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  applyFinderFocus,
  applyRoomSearch,
  buildFinderQuery,
  buildFinderRefreshPath,
  createFinderPollController,
  createInFlightGate,
  diffFinderRooms,
  isEndingSoon,
  isRecentlyReported,
  nextPollIntervalMs,
  parseFinderFocus,
  remainingMsForRoom,
  resolveFinderEmptyReason,
  roomsPayloadUnchanged,
  summarizeFinderDiff,
} from "../lib/finder-realtime";
import { FRESHNESS_MS } from "../lib/report-display";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function room(
  overrides: Partial<ActiveFreeClassroom> &
    Pick<ActiveFreeClassroom, "freeReportId" | "classroomId" | "roomNumber">,
): ActiveFreeClassroom {
  return {
    status: "unverified",
    confirmationCount: 1,
    occupiedStrikeCount: 0,
    createdAt: "2026-08-13T12:00:00.000Z",
    lastVerifiedAt: "2026-08-13T12:00:00.000Z",
    reportDate: "2026-08-13",
    expiresAt: "2026-08-13T13:00:00.000Z",
    buildingId: "b1",
    buildingCode: "UB",
    buildingName: "University Building",
    floorId: "f1",
    floorNumber: 5,
    timeSlotId: "s1",
    slotOrder: 1,
    startMinutes: 480,
    endMinutes: 530,
    slotRangeLabel: "08:00–08:50",
    ...overrides,
  };
}

function makeTimers() {
  const pending: { id: number; fn: () => void; ms: number }[] = [];
  let nextId = 1;
  return {
    pending,
    timers: {
      setTimeout(fn: () => void, ms: number) {
        const id = nextId++;
        pending.push({ id, fn, ms });
        return id;
      },
      clearTimeout(id: number) {
        const i = pending.findIndex((t) => t.id === id);
        if (i >= 0) pending.splice(i, 1);
      },
    },
    flush() {
      const batch = pending.splice(0, pending.length);
      for (const item of batch) item.fn();
    },
  };
}

async function main() {
  try {
    section("URL params — existing + focus");
    assert(parseFinderFocus(undefined) === "all", "default focus");
    assert(parseFinderFocus("recent") === "recent", "recent");
    assert(parseFinderFocus("ending") === "ending", "ending");
    assert(parseFinderFocus("nope") === "all", "invalid focus ignored");

    const q = buildFinderQuery({
      buildingId: "bld",
      floorId: "fl",
      timeSlotId: "slot-2",
      currentSlotId: "slot-1",
      focus: "recent",
    });
    assert(q.includes("building=bld"), "building param");
    assert(q.includes("floor=fl"), "floor param");
    assert(q.includes("slot=slot-2"), "slot param");
    assert(q.includes("focus=recent"), "focus param");

    const current = buildFinderQuery({
      buildingId: null,
      floorId: null,
      timeSlotId: "slot-1",
      currentSlotId: "slot-1",
      focus: "all",
    });
    assert(current === "", "current slot omitted; no focus for all");

    const allSlots = buildFinderQuery({
      buildingId: null,
      floorId: null,
      timeSlotId: null,
      currentSlotId: "slot-1",
      focus: "ending",
    });
    assert(allSlots.includes("slot=all"), "slot=all preserved");
    assert(allSlots.includes("focus=ending"), "ending focus");

    const refreshCurrent = buildFinderRefreshPath({
      applied: { buildingId: "b", floorId: "f", timeSlotId: "cur" },
      currentSlotId: "cur",
    });
    assert(
      refreshCurrent === "/api/finder?building=b&floor=f",
      `current slot omitted from poll URL, got ${refreshCurrent}`,
    );
    console.log("ok  URL query compatibility");

    section("Polling interval + adaptive expiry");
    const now = Date.parse("2026-08-13T12:00:00+05:30");
    const far = [
      room({
        freeReportId: "a",
        classroomId: "c",
        roomNumber: "501",
        reportDate: "2026-08-13",
        endMinutes: 12 * 60 + 30,
      }),
    ];
    const near = [
      room({
        freeReportId: "b",
        classroomId: "c",
        roomNumber: "502",
        reportDate: "2026-08-13",
        endMinutes: 12 * 60 + 4,
      }),
    ];
    assert(nextPollIntervalMs(far, now) === POLL_INTERVAL_MS, "default 20s");
    assert(nextPollIntervalMs(near, now) === ADAPTIVE_POLL_INTERVAL_MS, "adaptive 10s");
    assert(POLL_INTERVAL_MS >= 15_000 && POLL_INTERVAL_MS <= 30_000, "default in 15–30s");
    console.log("ok  poll intervals");

    section("Visibility-aware poll controller");
    const clock = makeTimers();
    let hidden = false;
    let fetches = 0 as number;
    const fetchGate: { resolve: (() => void) | null } = { resolve: null };
    const controller = createFinderPollController({
      fetchRooms: (signal) => {
        fetches += 1;
        return new Promise((resolve, reject) => {
          fetchGate.resolve = resolve;
          const onAbort = () => {
            fetchGate.resolve = null;
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          };
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener("abort", onAbort, { once: true });
        });
      },
      getDelayMs: () => 20_000,
      isHidden: () => hidden,
      timers: clock.timers,
    });

    controller.start();
    controller.start();
    assert(controller.isStarted(), "started");
    assert(controller.activeTimerCount() === 1, "no duplicate timers on double start");
    assert(fetches === 0, "does not poll immediately on start");

    clock.flush();
    await Promise.resolve();
    assert(fetches === 1, "first tick fetches");
    assert(controller.isInFlight(), "in flight");
    assert(controller.activeTimerCount() === 0, "timer cleared while in flight");

    await controller.refreshNow();
    assert(fetches === 1, "overlapping refresh skipped");

    hidden = true;
    controller.handleVisibility(true);
    assert(controller.activeTimerCount() === 0, "hidden clears timer");
    assert(!controller.isInFlight(), "hidden aborts in-flight");
    await Promise.resolve();
    assert(controller.activeTimerCount() === 0, "aborted fetch does not reschedule while hidden");

    hidden = false;
    controller.handleVisibility(false);
    await Promise.resolve();
    assert(fetches === 2, "resume fetches");
    fetchGate.resolve?.();
    fetchGate.resolve = null;
    await new Promise((r) => setImmediate(r));
    assert(controller.activeTimerCount() === 1, "resumes a single timer");

    controller.stop();
    assert(controller.activeTimerCount() === 0, "stop clears timer");
    controller.start();
    assert(controller.activeTimerCount() === 1, "restart single timer");
    controller.stop();
    console.log("ok  polling start/stop/hidden/resume/no duplicates");

    section("In-flight gate");
    const gate = createInFlightGate();
    assert(gate.tryEnter(), "first enter");
    assert(!gate.tryEnter(), "second blocked");
    gate.exit();
    assert(gate.tryEnter(), "enter after exit");
    console.log("ok  overlapping requests prevented");

    section("Fetch failure keeps scheduling");
    const failClock = makeTimers();
    let fails = 0;
    const failCtl = createFinderPollController({
      fetchRooms: async () => {
        fails += 1;
        throw new Error("network");
      },
      getDelayMs: () => 20_000,
      isHidden: () => false,
      timers: failClock.timers,
    });
    failCtl.start();
    failClock.flush();
    await new Promise((r) => setImmediate(r));
    assert(fails === 1, "failed tick counted");
    assert(failCtl.activeTimerCount() === 1, "retry scheduled after failure");
    failCtl.stop();
    console.log("ok  failure retries; caller keeps last data");

    section("Changed-room detection");
    const r1 = room({ freeReportId: "r1", classroomId: "c1", roomNumber: "501" });
    const r2 = room({ freeReportId: "r2", classroomId: "c2", roomNumber: "502" });
    const added = diffFinderRooms([r1], [r1, r2]);
    assert(added.added.length === 1 && added.added[0]?.freeReportId === "r2", "new room");
    const removed = diffFinderRooms([r1, r2], [r1]);
    assert(removed.removed.length === 1 && removed.removed[0]?.freeReportId === "r2", "removed room");
    const changed = diffFinderRooms(
      [r1],
      [{ ...r1, confirmationCount: 3, lastVerifiedAt: "2026-08-13T12:05:00.000Z" }],
    );
    assert(changed.changed.length === 1, "changed freshness/confidence");
    const same = diffFinderRooms([r1, r2], [r1, r2]);
    assert(
      same.added.length === 0 &&
        same.removed.length === 0 &&
        same.changed.length === 0,
      "no-change",
    );
    assert(roomsPayloadUnchanged([r1, r2], [r1, r2]), "payload unchanged");
    assert(
      summarizeFinderDiff(removed) === "UB 502 is no longer reported free.",
      "removed announcement",
    );
    console.log("ok  add/remove/change/no-change");

    section("Recently Reported + Ending Soon");
    const t0 = Date.parse("2026-08-13T12:00:00+05:30");
    assert(
      isRecentlyReported(new Date(t0 - 5 * 60 * 1000).toISOString(), t0),
      "5 min ago is recent",
    );
    assert(
      !isRecentlyReported(new Date(t0 - 20 * 60 * 1000).toISOString(), t0),
      "20 min ago not recent",
    );
    assert(FRESHNESS_MS.fresh === 10 * 60 * 1000, "window matches freshness");
    assert(
      isEndingSoon(
        room({
          freeReportId: "e",
          classroomId: "c",
          roomNumber: "1",
          reportDate: "2026-08-13",
          endMinutes: 12 * 60 + 8,
        }),
        t0,
      ),
      "8 min remaining",
    );
    assert(
      !isEndingSoon(
        room({
          freeReportId: "e2",
          classroomId: "c",
          roomNumber: "1",
          reportDate: "2026-08-13",
          endMinutes: 12 * 60 + 20,
        }),
        t0,
      ),
      "20 min not ending soon",
    );

    const mix = [
      room({
        freeReportId: "old",
        classroomId: "c1",
        roomNumber: "501",
        lastVerifiedAt: "2026-08-13T06:00:00.000Z",
        reportDate: "2026-08-13",
        endMinutes: 12 * 60 + 40,
      }),
      room({
        freeReportId: "fresh",
        classroomId: "c2",
        roomNumber: "502",
        lastVerifiedAt: new Date(t0 - 2 * 60 * 1000).toISOString(),
        reportDate: "2026-08-13",
        endMinutes: 12 * 60 + 40,
      }),
      room({
        freeReportId: "soon",
        classroomId: "c3",
        roomNumber: "503",
        lastVerifiedAt: "2026-08-13T06:00:00.000Z",
        reportDate: "2026-08-13",
        endMinutes: 12 * 60 + 5,
      }),
    ];
    const recent = applyFinderFocus(mix, "recent", t0);
    assert(recent.length === 1 && recent[0]?.roomNumber === "502", "recent filter");
    const ending = applyFinderFocus(mix, "ending", t0);
    assert(ending.length === 1 && ending[0]?.roomNumber === "503", "ending filter");
    const all = applyFinderFocus(mix, "all", t0);
    assert(all.length === 3, "all free");

    assert(
      resolveFinderEmptyReason({
        searchQuery: "",
        focus: "recent",
        roomsFromServer: 2,
        roomsAfterFocus: 0,
        roomsAfterSearch: 0,
        coverageKind: "none_free",
      }) === "no_recent",
      "honest no recently reported",
    );
    assert(
      resolveFinderEmptyReason({
        searchQuery: "",
        focus: "ending",
        roomsFromServer: 2,
        roomsAfterFocus: 0,
        roomsAfterSearch: 0,
        coverageKind: "none_free",
      }) === "no_ending",
      "honest no ending soon",
    );
    assert(
      resolveFinderEmptyReason({
        searchQuery: "",
        focus: "recent",
        roomsFromServer: 0,
        roomsAfterFocus: 0,
        roomsAfterSearch: 0,
        coverageKind: "inventory_gap",
      }) === "inventory_gap",
      "inventory gap wins when no rooms",
    );
    console.log("ok  focus filters + empty reasons");

    section("Search + polling");
    const polled = [
      room({ freeReportId: "a", classroomId: "c1", roomNumber: "504" }),
      room({ freeReportId: "b", classroomId: "c2", roomNumber: "1205" }),
    ];
    const searched = applyRoomSearch(polled, "504");
    assert(searched.length === 1 && searched[0]?.roomNumber === "504", "search respected after poll");
    console.log("ok  search + poll list");

    section("Countdown identity across poll updates");
    const before = room({
      freeReportId: "stable",
      classroomId: "c1",
      roomNumber: "501",
      reportDate: "2026-08-13",
      endMinutes: 530,
      confirmationCount: 1,
    });
    const afterPoll = {
      ...before,
      confirmationCount: 2,
      lastVerifiedAt: "2026-08-13T12:01:00.000Z",
    };
    assert(before.freeReportId === afterPoll.freeReportId, "stable report key");
    assert(before.reportDate === afterPoll.reportDate, "countdown date unchanged");
    assert(before.endMinutes === afterPoll.endMinutes, "countdown end unchanged");
    console.log("ok  countdown fields survive poll");

    section("V2.1 regression — inventory lookup");
    const ub = await prisma.building.findFirstOrThrow({ where: { code: "UB" } });
    const tp1 = await prisma.building.findFirstOrThrow({ where: { code: "TP1" } });
    const tp2 = await prisma.building.findFirstOrThrow({ where: { code: "TP2" } });
    const ub12 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: ub.id, floorNumber: 12 },
    });
    const ub5 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: ub.id, floorNumber: 5 },
    });
    const tp2f5 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: tp2.id, floorNumber: 5 },
    });
    const tp1f1 = await prisma.floor.findFirstOrThrow({
      where: { buildingId: tp1.id, floorNumber: 1 },
    });

    const room504ub5 = await prisma.classroom.findFirstOrThrow({
      where: { buildingId: ub.id, floorId: ub5.id, roomNumber: "504", isActive: true },
    });
    const room1205 = await prisma.classroom.findFirstOrThrow({
      where: { buildingId: ub.id, floorId: ub12.id, roomNumber: "1205", isActive: true },
    });
    const room504tp2 = await prisma.classroom.findFirstOrThrow({
      where: { buildingId: tp2.id, floorId: tp2f5.id, roomNumber: "504", isActive: true },
    });

    const reject504 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room504ub5.id,
    });
    const accept1205 = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: room1205.id,
    });
    const acceptTp2 = await lookupActiveClassroom({
      buildingId: tp2.id,
      floorId: tp2f5.id,
      classroomId: room504tp2.id,
    });
    assert(!reject504.ok, "UB Floor 12 + 504 rejected");
    assert(accept1205.ok, "UB Floor 12 + 1205 accepted");
    assert(acceptTp2.ok, "TP2 Floor 5 + 504 accepted");

    const tp1Coverage = await queryFinderCoverage({
      buildingId: tp1.id,
      floorId: tp1f1.id,
      timeSlotId: null,
    });
    assert(tp1Coverage.kind === "inventory_gap", "TP1 remains inventory gap");
    console.log("ok  V2.1 UB12/504, UB12/1205, TP2/504, TP1 gap");

    section("V2.2 + V2.3 DB — view filters, recent/ending");
    const slot = await prisma.timeSlot.findFirstOrThrow({
      orderBy: { slotOrder: "asc" },
    });
    const tmpPrefix = `V23-${Date.now().toString(36).toUpperCase()}`;
    const tmpClassroom = async (suffix: string) => {
      const roomNumber = `${tmpPrefix}-${suffix}`;
      return prisma.classroom.upsert({
        where: {
          buildingId_floorId_roomNumber: {
            buildingId: ub.id,
            floorId: ub5.id,
            roomNumber,
          },
        },
        create: {
          buildingId: ub.id,
          floorId: ub5.id,
          roomNumber,
          isActive: true,
        },
        update: { isActive: true },
      });
    };
    const cLive = await tmpClassroom("L");
    const cHidden = await tmpClassroom("H");
    const cExpired = await tmpClassroom("E");
    const reportDate = new Date();
    reportDate.setUTCHours(0, 0, 0, 0);

    const live = await prisma.freeReport.create({
      data: {
        classroomId: cLive.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    const hiddenReport = await prisma.freeReport.create({
      data: {
        classroomId: cHidden.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "hidden",
        confirmationCount: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const expiredReport = await prisma.freeReport.create({
      data: {
        classroomId: cExpired.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "expired",
        confirmationCount: 1,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const viewRows = await queryActiveFreeClassrooms({
      buildingId: ub.id,
      floorId: ub5.id,
      timeSlotId: slot.id,
    });
    const ids = new Set(viewRows.map((r) => r.freeReportId));
    assert(ids.has(live.id), "live report in view");
    assert(!ids.has(hiddenReport.id), "hidden excluded");
    assert(!ids.has(expiredReport.id), "expired excluded");

    const liveRow = viewRows.find((r) => r.freeReportId === live.id);
    if (!liveRow) throw new Error("FAIL: live view row present");
    const slotEndMs = remainingMsForRoom(liveRow, 0);
    const fourMinBeforeEnd = slotEndMs - 4 * 60 * 1000;
    const endingSoon = applyFinderFocus([liveRow], "ending", fourMinBeforeEnd);
    assert(
      endingSoon.some((r) => r.freeReportId === live.id),
      "ending-soon uses slot expires_at / end time",
    );
    const recently = applyFinderFocus(viewRows, "recent", Date.now());
    assert(
      recently.some((r) => r.freeReportId === live.id),
      "recently reported uses last_verified_at",
    );

    await prisma.freeReport.deleteMany({
      where: { id: { in: [live.id, hiddenReport.id, expiredReport.id] } },
    });
    await prisma.classroom.deleteMany({
      where: { id: { in: [cLive.id, cHidden.id, cExpired.id] } },
    });
    console.log("ok  view excludes hidden/expired; recent/ending use existing columns");

    console.log("\nV2.3 Finder real-time tests passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

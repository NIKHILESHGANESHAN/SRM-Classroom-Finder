/**
 * V2.3 Finder real-time helpers (visibility-aware polling — not WebSockets).
 *
 * Polling logic
 * -------------
 * POLL_INTERVAL_MS = 20s (conservative campus/mobile default inside 15–30s).
 *
 * Adaptive interval: if any *currently displayed* room has 0 < time-to-expiry
 * ≤ 5 minutes, the next delay is ADAPTIVE_POLL_INTERVAL_MS (10s). Only Finder
 * uses this; other pages do not poll. The default interval stays 20s.
 *
 * Recently Reported: last_verified_at within FRESHNESS_MS.fresh (10 min) —
 * the existing “Fresh / Very Fresh” window. No extra DB column.
 *
 * Ending Soon: expires_at within ENDING_SOON_MS (10 min). Slot periods are
 * ~50–60 min; 10 minutes is the last sixth of a slot. No extra DB column.
 */

import { FRESHNESS_MS } from "@/lib/report-display";
import type { ActiveFreeClassroom, FinderCoverage } from "@/lib/finder-data";

export const POLL_INTERVAL_MS = 20_000;
export const ADAPTIVE_POLL_INTERVAL_MS = 10_000;
export const ADAPTIVE_EXPIRY_WINDOW_MS = 5 * 60 * 1000;
export const ENDING_SOON_MS = 10 * 60 * 1000;
export const RECENTLY_REPORTED_MS = FRESHNESS_MS.fresh;

export type FinderFocus = "all" | "recent" | "ending";

export type FinderAppliedFilters = {
  buildingId: string | null;
  floorId: string | null;
  timeSlotId: string | null;
};

export type FinderRefreshPayload = {
  rooms: ActiveFreeClassroom[];
  coverage: FinderCoverage;
  currentSlotId: string | null;
  fetchedAt: string;
};

export function parseFinderFocus(value: string | undefined | null): FinderFocus {
  if (value === "recent" || value === "ending") return value;
  return "all";
}

export function buildFinderQuery(params: {
  buildingId: string | null;
  floorId: string | null;
  timeSlotId: string | null;
  currentSlotId: string | null;
  focus?: FinderFocus;
}): string {
  const q = new URLSearchParams();
  if (params.buildingId) q.set("building", params.buildingId);
  if (params.floorId) q.set("floor", params.floorId);
  if (params.timeSlotId && params.timeSlotId !== params.currentSlotId) {
    q.set("slot", params.timeSlotId);
  }
  if (params.timeSlotId === null) {
    q.set("slot", "all");
  }
  if (params.focus === "recent" || params.focus === "ending") {
    q.set("focus", params.focus);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Poll URL: send slot=all or an explicit non-current slot id.
 * Omit slot when viewing “free right now” so the API re-resolves the current slot.
 */
export function buildFinderRefreshPath(args: {
  applied: FinderAppliedFilters;
  currentSlotId: string | null;
}): string {
  const q = new URLSearchParams();
  if (args.applied.buildingId) q.set("building", args.applied.buildingId);
  if (args.applied.floorId) q.set("floor", args.applied.floorId);
  if (args.applied.timeSlotId === null) {
    q.set("slot", "all");
  } else if (
    args.applied.timeSlotId &&
    args.applied.timeSlotId !== args.currentSlotId
  ) {
    q.set("slot", args.applied.timeSlotId);
  }
  const s = q.toString();
  return s ? `/api/finder?${s}` : "/api/finder";
}

/**
 * Remaining time until the report’s slot end (same IST construction as the
 * Finder countdown). This is the client meaning of `expires_at` without
 * depending on TIMESTAMP WITHOUT TIME ZONE → ISO conversion.
 */
export function remainingMsForRoom(
  room: Pick<ActiveFreeClassroom, "reportDate" | "endMinutes">,
  nowMs: number,
): number {
  const h = Math.floor(room.endMinutes / 60);
  const m = room.endMinutes % 60;
  const iso = `${room.reportDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, t - nowMs);
}

export function isRecentlyReported(
  lastVerifiedAtIso: string,
  nowMs: number,
  windowMs: number = RECENTLY_REPORTED_MS,
): boolean {
  const t = new Date(lastVerifiedAtIso).getTime();
  if (Number.isNaN(t)) return false;
  const age = nowMs - t;
  return age >= 0 && age <= windowMs;
}

export function isEndingSoon(
  room: Pick<ActiveFreeClassroom, "reportDate" | "endMinutes">,
  nowMs: number,
  windowMs: number = ENDING_SOON_MS,
): boolean {
  const remaining = remainingMsForRoom(room, nowMs);
  return remaining > 0 && remaining <= windowMs;
}

export function nextPollIntervalMs(
  rooms: Pick<ActiveFreeClassroom, "reportDate" | "endMinutes">[],
  nowMs: number,
): number {
  const nearExpiry = rooms.some((room) => {
    const remaining = remainingMsForRoom(room, nowMs);
    return remaining > 0 && remaining <= ADAPTIVE_EXPIRY_WINDOW_MS;
  });
  return nearExpiry ? ADAPTIVE_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
}

export function roomUpdateSignature(
  room: Pick<
    ActiveFreeClassroom,
    | "freeReportId"
    | "status"
    | "confirmationCount"
    | "occupiedStrikeCount"
    | "lastVerifiedAt"
    | "expiresAt"
    | "classroomId"
  >,
): string {
  return [
    room.freeReportId,
    room.classroomId,
    room.status,
    room.confirmationCount,
    room.occupiedStrikeCount,
    room.lastVerifiedAt,
    room.expiresAt,
  ].join("|");
}

export type FinderRoomDiff = {
  added: ActiveFreeClassroom[];
  removed: ActiveFreeClassroom[];
  changed: ActiveFreeClassroom[];
  unchangedIds: string[];
};

export function diffFinderRooms(
  previous: ActiveFreeClassroom[],
  next: ActiveFreeClassroom[],
): FinderRoomDiff {
  const prevById = new Map(previous.map((r) => [r.freeReportId, r]));
  const nextById = new Map(next.map((r) => [r.freeReportId, r]));

  const added: ActiveFreeClassroom[] = [];
  const changed: ActiveFreeClassroom[] = [];
  const unchangedIds: string[] = [];

  for (const room of next) {
    const prev = prevById.get(room.freeReportId);
    if (!prev) {
      added.push(room);
      continue;
    }
    if (roomUpdateSignature(prev) !== roomUpdateSignature(room)) {
      changed.push(room);
    } else {
      unchangedIds.push(room.freeReportId);
    }
  }

  const removed: ActiveFreeClassroom[] = [];
  for (const room of previous) {
    if (!nextById.has(room.freeReportId)) removed.push(room);
  }

  return { added, removed, changed, unchangedIds };
}

export function roomsPayloadUnchanged(
  previous: ActiveFreeClassroom[],
  next: ActiveFreeClassroom[],
): boolean {
  if (previous.length !== next.length) return false;
  for (let i = 0; i < previous.length; i++) {
    const a = previous[i];
    const b = next[i];
    if (!a || !b) return false;
    if (roomUpdateSignature(a) !== roomUpdateSignature(b)) return false;
    if (a.roomNumber !== b.roomNumber) return false;
  }
  return true;
}

export function applyFinderFocus(
  rooms: ActiveFreeClassroom[],
  focus: FinderFocus,
  nowMs: number,
): ActiveFreeClassroom[] {
  if (focus === "recent") {
    return rooms
      .filter((r) => isRecentlyReported(r.lastVerifiedAt, nowMs))
      .sort(
        (a, b) =>
          new Date(b.lastVerifiedAt).getTime() -
          new Date(a.lastVerifiedAt).getTime(),
      );
  }
  if (focus === "ending") {
    return rooms
      .filter((r) => isEndingSoon(r, nowMs))
      .sort(
        (a, b) => remainingMsForRoom(a, nowMs) - remainingMsForRoom(b, nowMs),
      );
  }
  return rooms;
}

export function applyRoomSearch(
  rooms: ActiveFreeClassroom[],
  query: string,
): ActiveFreeClassroom[] {
  const q = query.trim().toLowerCase();
  if (!q) return rooms;
  return rooms.filter((r) => r.roomNumber.toLowerCase().includes(q));
}

export function summarizeFinderDiff(
  diff: FinderRoomDiff,
): string | null {
  const addN = diff.added.length;
  const remN = diff.removed.length;
  const chN = diff.changed.length;

  if (addN === 0 && remN === 0 && chN === 0) return null;

  if (addN === 1 && remN === 0 && chN === 0) {
    const room = diff.added[0];
    if (room) {
      return `${room.buildingCode} ${room.roomNumber} is now reported free.`;
    }
  }
  if (remN === 1 && addN === 0 && chN === 0) {
    const room = diff.removed[0];
    if (room) {
      return `${room.buildingCode} ${room.roomNumber} is no longer reported free.`;
    }
  }

  const updated = addN + remN + chN;
  return `${updated} classroom${updated === 1 ? "" : "s"} updated.`;
}

export type FinderEmptyReason =
  | "search_miss"
  | "inventory_gap"
  | "insufficient_reports"
  | "none_free"
  | "no_recent"
  | "no_ending";

export function resolveFinderEmptyReason(args: {
  searchQuery: string;
  focus: FinderFocus;
  roomsFromServer: number;
  roomsAfterFocus: number;
  roomsAfterSearch: number;
  coverageKind: FinderCoverage["kind"];
}): FinderEmptyReason | null {
  if (args.roomsAfterSearch > 0) return null;
  if (args.searchQuery.trim() && args.roomsAfterFocus > 0) return "search_miss";
  if (args.roomsFromServer === 0) return args.coverageKind;
  if (args.focus === "recent") return "no_recent";
  if (args.focus === "ending") return "no_ending";
  return args.coverageKind;
}

export type InFlightGate = {
  tryEnter: () => boolean;
  exit: () => void;
  isBusy: () => boolean;
};

export function createInFlightGate(): InFlightGate {
  let busy = false;
  return {
    tryEnter() {
      if (busy) return false;
      busy = true;
      return true;
    },
    exit() {
      busy = false;
    },
    isBusy() {
      return busy;
    },
  };
}

export type FinderPollTimer = {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
};

export type FinderPollController = {
  start: () => void;
  stop: () => void;
  handleVisibility: (hidden: boolean) => void;
  refreshNow: () => Promise<void>;
  isStarted: () => boolean;
  activeTimerCount: () => number;
  isInFlight: () => boolean;
};

/**
 * Single-timer poll loop. start() is idempotent; stop() clears timer + aborts.
 * Hidden tabs never schedule the next tick. Overlapping fetches are skipped.
 */
export function createFinderPollController(args: {
  fetchRooms: (signal: AbortSignal) => Promise<void>;
  getDelayMs: () => number;
  isHidden: () => boolean;
  timers?: FinderPollTimer;
}): FinderPollController {
  const timers: FinderPollTimer = args.timers ?? {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };

  let started = false;
  let timerId: number | null = null;
  let inFlight = false;
  let abort: AbortController | null = null;
  let generation = 0;

  function clearTimer() {
    if (timerId !== null) {
      timers.clearTimeout(timerId);
      timerId = null;
    }
  }

  function schedule() {
    clearTimer();
    if (!started || args.isHidden()) return;
    timerId = timers.setTimeout(() => {
      timerId = null;
      void runTick();
    }, args.getDelayMs());
  }

  async function runTick() {
    if (!started || args.isHidden()) return;
    if (inFlight) {
      schedule();
      return;
    }
    const gen = ++generation;
    inFlight = true;
    abort = new AbortController();
    const signal = abort.signal;
    try {
      await args.fetchRooms(signal);
    } catch {
      // Caller records errors; keep last good data.
    } finally {
      if (gen !== generation) return;
      abort = null;
      inFlight = false;
      if (started && !args.isHidden()) schedule();
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      schedule();
    },
    stop() {
      started = false;
      generation += 1;
      clearTimer();
      abort?.abort();
      abort = null;
      inFlight = false;
    },
    handleVisibility(hidden: boolean) {
      if (!started) return;
      if (hidden) {
        generation += 1;
        clearTimer();
        abort?.abort();
        abort = null;
        inFlight = false;
        return;
      }
      void runTick();
    },
    async refreshNow() {
      if (!started || args.isHidden()) return;
      clearTimer();
      await runTick();
    },
    isStarted() {
      return started;
    },
    activeTimerCount(): number {
      return timerId === null ? 0 : 1;
    },
    isInFlight() {
      return inFlight;
    },
  };
}

export function formatUpdatedAgo(lastUpdatedMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - lastUpdatedMs);
  const sec = Math.floor(delta / 1000);
  if (sec < 8) return "Updated just now";
  if (sec < 60) return `Last updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return "Last updated 1 min ago";
  return `Last updated ${min} min ago`;
}

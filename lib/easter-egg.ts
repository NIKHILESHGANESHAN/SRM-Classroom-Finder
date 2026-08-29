/**
 * V4 Easter Egg phases and daily reporting cycle (IST / Asia/Kolkata).
 *
 * Fixed clock windows — independent of academic slot boundaries.
 * Slot ±5 min grace still governs which period is selectable during normal hours.
 */

import {
  CAMPUS_TIMEZONE,
  getCampusDateString,
  getNowMinutesInTz,
} from "@/lib/slots";

/** Minutes from midnight IST — inclusive boundaries. */
export const MORNING_EGG_START = 4 * 60; // 04:00
export const MORNING_EGG_END = 7 * 60 + 50; // 07:50
export const NORMAL_START = 7 * 60 + 51; // 07:51
export const EVENING_EGG_START = 17 * 60; // 17:00
export const EVENING_EGG_END = 20 * 60 + 59; // 20:59
export const NIGHT_EGG_START = 21 * 60; // 21:00
export const NIGHT_EGG_END = 3 * 60 + 59; // 03:59 (early-morning segment)

/** Daily Finder/reporting cycle ends at 23:50 IST; fresh day at 00:00. */
export const DAILY_CYCLE_END_MINUTES = 23 * 60 + 50; // 23:50

export type EasterEggPhase = "morning" | "evening" | "night" | "normal";

export const EVENING_EGG_DISMISS_KEY = "classfinder-evening-egg-dismissed";
export const NIGHT_EGG_DISMISS_KEY = "classfinder-night-egg-dismissed";

/** Current Easter Egg phase from campus clock (IST). */
export function getEasterEggPhase(
  nowMinutes: number = getNowMinutesInTz(),
): EasterEggPhase {
  if (nowMinutes >= MORNING_EGG_START && nowMinutes <= MORNING_EGG_END) {
    return "morning";
  }
  if (nowMinutes >= EVENING_EGG_START && nowMinutes <= EVENING_EGG_END) {
    return "evening";
  }
  if (nowMinutes >= NIGHT_EGG_START || nowMinutes <= NIGHT_EGG_END) {
    return "night";
  }
  return "normal";
}

export function isMorningEasterEgg(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  return getEasterEggPhase(nowMinutes) === "morning";
}

export function isEveningEasterEgg(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  return getEasterEggPhase(nowMinutes) === "evening";
}

export function isNightEasterEgg(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  return getEasterEggPhase(nowMinutes) === "night";
}

/** Contributor page shows Easter Egg gate only — no wizard — during evening/night. */
export function isContributeEasterEggGateActive(phase: EasterEggPhase): boolean {
  return phase === "evening" || phase === "night";
}

/** Evening and Night Easter Eggs block new classroom reports. */
export function isReportingBlockedByEasterEgg(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  const phase = getEasterEggPhase(nowMinutes);
  return phase === "evening" || phase === "night";
}

/** True from 00:00 through 23:49 IST; false from 23:50 through 23:59. */
export function isDailyReportingCycleOpen(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  return nowMinutes < DAILY_CYCLE_END_MINUTES;
}

/** Authoritative server/client check for submitting a new free report. */
export function isReportingAllowed(
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  return (
    isDailyReportingCycleOpen(nowMinutes) &&
    !isReportingBlockedByEasterEgg(nowMinutes)
  );
}

/**
 * Campus YYYY-MM-DD for active Finder listings.
 * Returns null when the daily cycle has ended (23:50–23:59) so Finder shows a fresh empty state.
 */
export function getActiveFinderReportDate(
  now: Date = new Date(),
  timeZone: string = CAMPUS_TIMEZONE,
): string | null {
  const nowMinutes = getNowMinutesInTz(now, timeZone);
  if (!isDailyReportingCycleOpen(nowMinutes)) return null;
  return getCampusDateString(now, timeZone);
}

/** Calendar date for evening-egg dismiss (per campus day). */
export function eveningEggDismissStorageKey(campusDate: string): string {
  return `${EVENING_EGG_DISMISS_KEY}:${campusDate}`;
}

/**
 * Night spans 21:00 → 03:59. Early-morning night belongs to the previous evening's session.
 */
export function nightEggDismissStorageKey(
  now: Date = new Date(),
  timeZone: string = CAMPUS_TIMEZONE,
): string {
  const nowMinutes = getNowMinutesInTz(now, timeZone);
  const campusDate =
    nowMinutes <= NIGHT_EGG_END
      ? getCampusDateStringForOffset(-1, now, timeZone)
      : getCampusDateString(now, timeZone);
  return `${NIGHT_EGG_DISMISS_KEY}:${campusDate}`;
}

/** Shift campus calendar date by `dayOffset` days. */
export function getCampusDateStringForOffset(
  dayOffset: number,
  now: Date = new Date(),
  timeZone: string = CAMPUS_TIMEZONE,
): string {
  const ymd = getCampusDateString(now, timeZone);
  const [y, m, d] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + dayOffset));
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

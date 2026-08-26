/**
 * Finder UI helpers — presentation only. Does not alter slot logic or data flow.
 */

import {
  getNowMinutesInTz,
  SLOT_GRACE_MINUTES,
  type SlotTimeFields,
} from "@/lib/slots";

/** True when campus clock is before the first slot's reportable grace window. */
export function isBeforeFirstReportablePeriod(
  slots: Pick<SlotTimeFields, "startMinutes" | "slotOrder">[],
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  if (slots.length === 0) return false;
  const first = [...slots].sort((a, b) => a.slotOrder - b.slotOrder)[0];
  return nowMinutes < first.startMinutes - SLOT_GRACE_MINUTES;
}

/** True when campus clock is after the last slot's reportable grace window. */
export function isAfterLastReportablePeriod(
  slots: Pick<SlotTimeFields, "endMinutes" | "slotOrder">[],
  nowMinutes: number = getNowMinutesInTz(),
): boolean {
  if (slots.length === 0) return false;
  const last = [...slots].sort((a, b) => b.slotOrder - a.slotOrder)[0];
  return nowMinutes > last.endMinutes + SLOT_GRACE_MINUTES;
}

export const MORNING_NOTE_DISMISS_KEY = "classfinder-morning-note-dismissed";

export function morningNoteDismissStorageKey(campusDate: string): string {
  return `${MORNING_NOTE_DISMISS_KEY}:${campusDate}`;
}

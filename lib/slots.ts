/**
 * Time-slot detection helpers (IST / Asia/Kolkata).
 *
 * Campus periods are wall-clock times. All “now” comparisons use India Standard
 * Time so Vercel (UTC) and local laptops agree with SRM KTR schedules.
 *
 * Grace window (±5 min): a slot is selectable when
 *   start − 5min ≤ now ≤ end + 5min
 * so students can still report slightly early/late between periods.
 */

export const CAMPUS_TIMEZONE = "Asia/Kolkata" as const;
export const SLOT_GRACE_MINUTES = 5;

export type SlotTimeFields = {
  id: string;
  slotOrder: number;
  /** Minutes from midnight IST (0–1439), derived from TIME columns */
  startMinutes: number;
  endMinutes: number;
};

/** Parse a Prisma @db.Time Date (or HH:MM(:SS) string) into minutes from midnight. */
export function timeToMinutes(value: Date | string): number {
  if (typeof value === "string") {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + (m || 0);
  }
  // Prisma returns Time as Date; use UTC components (seeded via Date.UTC)
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

/** Current clock as minutes from midnight in Asia/Kolkata. */
export function getNowMinutesInTz(
  now: Date = new Date(),
  timeZone: string = CAMPUS_TIMEZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // en-GB + hour12:false can yield "24" for midnight in some engines
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

/** Calendar date YYYY-MM-DD in campus TZ (for free_reports.report_date). */
export function getCampusDateString(
  now: Date = new Date(),
  timeZone: string = CAMPUS_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatMinutesAsLabel(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatSlotRangeLabel(startMinutes: number, endMinutes: number): string {
  return `${formatMinutesAsLabel(startMinutes)}–${formatMinutesAsLabel(endMinutes)}`;
}

/**
 * Slot is within the ±grace window around [start, end].
 * Used to enable/disable the segmented control options.
 */
export function isSlotSelectable(
  slot: Pick<SlotTimeFields, "startMinutes" | "endMinutes">,
  nowMinutes: number,
  graceMinutes: number = SLOT_GRACE_MINUTES,
): boolean {
  return (
    nowMinutes >= slot.startMinutes - graceMinutes &&
    nowMinutes <= slot.endMinutes + graceMinutes
  );
}

/**
 * The “current” period: prefer the slot whose [start, end] contains now;
 * otherwise the selectable slot whose midpoint is closest to now (grace edges).
 */
export function getCurrentSlotId(
  slots: SlotTimeFields[],
  nowMinutes: number = getNowMinutesInTz(),
): string | null {
  if (slots.length === 0) return null;

  const containing = slots.find(
    (s) => nowMinutes >= s.startMinutes && nowMinutes < s.endMinutes,
  );
  if (containing) return containing.id;

  // Exact end boundary (e.g. 8:50) still belongs to that slot before the next starts
  const atEnd = slots.find((s) => nowMinutes === s.endMinutes);
  if (atEnd) return atEnd.id;

  const selectable = slots.filter((s) => isSlotSelectable(s, nowMinutes));
  if (selectable.length === 0) return null;

  selectable.sort((a, b) => {
    const midA = (a.startMinutes + a.endMinutes) / 2;
    const midB = (b.startMinutes + b.endMinutes) / 2;
    return Math.abs(midA - nowMinutes) - Math.abs(midB - nowMinutes);
  });
  return selectable[0]?.id ?? null;
}

export function disabledSlotTooltip(
  startMinutes: number,
  endMinutes: number,
): string {
  return `Only available ${formatSlotRangeLabel(startMinutes, endMinutes)} right now`;
}

/**
 * Build expires_at = report_date (campus) + slot end_time.
 *
 * free_reports.expires_at is TIMESTAMP WITHOUT TIME ZONE storing IST wall-clock.
 * Prisma serializes Date via UTC fields, so we set UTC hours/minutes to the IST
 * end time — that way Postgres NOW() (IST in our deploy) compares correctly.
 */
export function buildExpiresAt(
  reportDateYmd: string,
  endMinutes: number,
  _timeZone: string = CAMPUS_TIMEZONE,
): Date {
  const [y, mo, d] = reportDateYmd.split("-").map(Number);
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  void _timeZone;
  return new Date(Date.UTC(y, mo - 1, d, endH, endM, 0));
}

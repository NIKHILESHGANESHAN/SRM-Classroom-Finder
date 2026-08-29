/**
 * Report temporal integrity — mirrors `active_free_classrooms` view semantics.
 *
 * A report is currently active only when:
 *   - status is unverified or confirmed, AND
 *   - expires_at > now (same rule as the SQL view: not >=).
 *
 * Cleanup cron may lag; query/UI layers must not treat past-due rows as active.
 */

import type { Prisma } from "@prisma/client";

export const ACTIVE_FREE_REPORT_STATUSES = ["unverified", "confirmed"] as const;

export type ActiveFreeReportStatus = (typeof ACTIVE_FREE_REPORT_STATUSES)[number];

/** True when expires_at is strictly after `now` (matches view `expires_at > NOW()`). */
export function isReportTemporallyActive(
  expiresAt: Date | string,
  now: Date = new Date(),
): boolean {
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() > now.getTime();
}

/**
 * UI / admin display status — DB status plus temporal expiry overlay.
 * Hidden stays hidden; stale unverified/confirmed reads as expired.
 */
export function getEffectiveReportStatus(
  dbStatus: string,
  expiresAt: Date | string,
  now: Date = new Date(),
): string {
  if (dbStatus === "hidden") return "hidden";
  if (dbStatus === "expired") return "expired";
  if (!isReportTemporallyActive(expiresAt, now)) return "expired";
  return dbStatus;
}

/** Prisma filter for currently active free reports (admin counts, audits). */
export function activeFreeReportWhere(
  now: Date = new Date(),
): Prisma.FreeReportWhereInput {
  return {
    status: { in: [...ACTIVE_FREE_REPORT_STATUSES] },
    expiresAt: { gt: now },
  };
}

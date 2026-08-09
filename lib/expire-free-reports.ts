/**
 * Auto-expiry for free_reports (Phase 8).
 *
 * DBMS: single UPDATE matching the coursework SQL —
 *   UPDATE free_reports SET status = 'expired'
 *   WHERE expires_at < NOW() AND status != 'expired'
 *
 * Uses Postgres NOW() (same clock as the `active_free_classrooms` view) so
 * timestamp-without-time-zone `expires_at` comparisons stay consistent.
 * Rows are retained for Stats history; the view excludes them.
 */

import { prisma } from "@/lib/prisma";

export type ExpireFreeReportsResult = {
  expiredCount: number;
  durationMs: number;
  timestamp: string;
};

/**
 * Mark past-due free reports as expired in one round-trip.
 */
export async function expireFreeReports(): Promise<ExpireFreeReportsResult> {
  const started = Date.now();
  const timestamp = new Date().toISOString();

  // Prisma $executeRaw returns the number of rows affected
  const expiredCount = await prisma.$executeRaw`
    UPDATE "free_reports"
    SET "status" = 'expired'::"FreeReportStatus"
    WHERE "expires_at" < NOW()
      AND "status" <> 'expired'::"FreeReportStatus"
  `;

  return {
    expiredCount: Number(expiredCount),
    durationMs: Date.now() - started,
    timestamp,
  };
}

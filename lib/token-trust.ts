/**
 * Anonymous token trust / soft-throttle (Phase 9).
 *
 * DBMS: COUNT free_reports for a contributor_token on report_date where
 * status = 'hidden'. Uses the existing index (contributor_token, report_date).
 *
 * Rules (silent — never surfaced in the UI):
 *   - Trusted: confirmation_count >= 2 → status "confirmed"
 *     (original reporter + 1 independent confirmation)
 *   - Soft-throttled (≥3 hidden reports today): confirmation_count >= 3
 *     (original + 2 independent confirmations) before "confirmed"
 *
 * Confidence is stored in free_reports.status; the badge reads status only.
 */

import type { FreeReportStatus, Prisma, PrismaClient } from "@prisma/client";

/** Hidden contributions in one campus day that trigger soft-throttle. */
export const HIDDEN_REPORTS_SOFT_THROTTLE = 3;

/** confirmation_count required for Confirmed when the original token is trusted. */
export const TRUSTED_CONFIRMATION_THRESHOLD = 2;

/** confirmation_count required when the original token is soft-throttled. */
export const THROTTLED_CONFIRMATION_THRESHOLD = 3;

export type TrustTx = Prisma.TransactionClient | PrismaClient;

/**
 * How many of this token's free reports were hidden on the given campus day.
 * Efficient: hits @@index([contributorToken, reportDate]).
 */
export async function countHiddenReportsForTokenOnDate(
  db: TrustTx,
  contributorToken: string,
  reportDate: Date,
): Promise<number> {
  return db.freeReport.count({
    where: {
      contributorToken,
      reportDate,
      status: "hidden",
    },
  });
}

/**
 * Soft-throttle when the token already has ≥3 hidden reports today.
 * Callers must not expose this boolean to the client.
 */
export async function isTokenSoftThrottled(
  db: TrustTx,
  contributorToken: string,
  reportDate: Date,
): Promise<boolean> {
  const hidden = await countHiddenReportsForTokenOnDate(
    db,
    contributorToken,
    reportDate,
  );
  return hidden >= HIDDEN_REPORTS_SOFT_THROTTLE;
}

/**
 * Confirmation threshold for reports originally filed by this token.
 * Evaluated against the original contributor_token (not the confirmer).
 */
export async function getConfirmationThresholdForToken(
  db: TrustTx,
  contributorToken: string,
  reportDate: Date,
): Promise<number> {
  const throttled = await isTokenSoftThrottled(db, contributorToken, reportDate);
  return throttled
    ? THROTTLED_CONFIRMATION_THRESHOLD
    : TRUSTED_CONFIRMATION_THRESHOLD;
}

/**
 * Derive next free_report status after bumping confirmation_count.
 * Never upgrades hidden/expired; never demotes confirmed.
 */
export function nextStatusAfterConfirmation(args: {
  currentStatus: FreeReportStatus;
  nextConfirmationCount: number;
  threshold: number;
}): FreeReportStatus {
  const { currentStatus, nextConfirmationCount, threshold } = args;

  if (currentStatus === "hidden" || currentStatus === "expired") {
    return currentStatus;
  }
  if (currentStatus === "confirmed") {
    return "confirmed";
  }
  // unverified → confirmed only when count meets the trust-weighted threshold
  if (nextConfirmationCount >= threshold) {
    return "confirmed";
  }
  return "unverified";
}

/**
 * Display rule for the Finder confidence badge.
 * Status is authoritative — never infer Confirmed from count alone
 * (soft-throttled rooms can sit at count=2 while still unverified).
 * Hidden / expired must never read as Confirmed.
 */
export function isConfirmedBadgeStatus(
  status: FreeReportStatus | string,
): boolean {
  return status === "confirmed";
}

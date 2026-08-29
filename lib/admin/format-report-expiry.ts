/**
 * Admin report expiry formatting.
 *
 * free_reports.expires_at is TIMESTAMP WITHOUT TIME ZONE storing IST wall-clock
 * via Date.UTC(y, m, d, hour, min) in buildExpiresAt(). Format with UTC so the
 * displayed time matches the stored campus slot end — not a shifted instant.
 */

export function formatReportExpiresAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Flags test-script sentinels and dates far from the report's campus day. */
export function isAnomalousReportExpiry(
  iso: string,
  reportDateYmd: string,
): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;

  const reportYear = Number(reportDateYmd.slice(0, 4));
  const expiryYear = date.getUTCFullYear();
  if (expiryYear >= reportYear + 2 || expiryYear < reportYear - 1) return true;
  if (expiryYear === 2000 || expiryYear >= 2099) return true;
  return false;
}

/**
 * Derived Finder display (V2.2) — freshness and richer confidence.
 * No extra status columns: values come from timestamps + confirmation_count +
 * occupied strike counts + free_reports.status.
 */

import { isConfirmedBadgeStatus } from "@/lib/token-trust";

export const FRESHNESS_MS = {
  veryFresh: 2 * 60 * 1000,
  fresh: 10 * 60 * 1000,
  aging: 30 * 60 * 1000,
} as const;

export type FreshnessKind = "very_fresh" | "fresh" | "aging" | "stale";

export type FreshnessDisplay = {
  kind: FreshnessKind;
  label: string;
  detail: string;
  ariaLabel: string;
};

export function deriveFreshness(
  lastVerifiedAt: Date,
  now: Date = new Date(),
): FreshnessDisplay {
  const ageMs = Math.max(0, now.getTime() - lastVerifiedAt.getTime());
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  const ago =
    minutes < 1
      ? "just now"
      : minutes === 1
        ? "1 min ago"
        : `${minutes} min ago`;

  if (ageMs < FRESHNESS_MS.veryFresh) {
    return {
      kind: "very_fresh",
      label: "Very Fresh",
      detail: `Verified ${ago}`,
      ariaLabel: `Very fresh, verified ${ago}`,
    };
  }
  if (ageMs < FRESHNESS_MS.fresh) {
    return {
      kind: "fresh",
      label: "Fresh",
      detail: `Verified ${ago}`,
      ariaLabel: `Fresh, verified ${ago}`,
    };
  }
  if (ageMs < FRESHNESS_MS.aging) {
    return {
      kind: "aging",
      label: "Aging",
      detail: `Verified ${ago}`,
      ariaLabel: `Aging, last verified ${ago}`,
    };
  }
  return {
    kind: "stale",
    label: "Stale",
    detail: `Verified ${ago}`,
    ariaLabel: `Stale, last verified ${ago}`,
  };
}

export type ConfidenceLevel = "high" | "moderate" | "low";

export type ConfidenceDisplay = {
  /** Authoritative Unverified / Confirmed — never Confirmed for hidden/expired */
  badge: "confirmed" | "unverified";
  level: ConfidenceLevel;
  confirmations: number;
  corrections: number;
  summary: string;
  ariaLabel: string;
};

export function deriveConfidence(args: {
  status: string;
  confirmationCount: number;
  occupiedStrikeCount: number;
}): ConfidenceDisplay | null {
  const { status, confirmationCount, occupiedStrikeCount } = args;

  if (status === "hidden" || status === "expired") {
    return null;
  }

  const confirmed = isConfirmedBadgeStatus(status);
  const confirmations = Math.max(1, confirmationCount);
  const corrections = Math.max(0, occupiedStrikeCount);

  let level: ConfidenceLevel = "low";
  if (confirmed && confirmations >= 4) level = "high";
  else if (confirmed) level = "moderate";

  const confWord = confirmations === 1 ? "confirmation" : "confirmations";
  const corrWord = corrections === 1 ? "correction" : "corrections";
  const summary =
    corrections > 0
      ? `${confirmations} ${confWord} · ${corrections} ${corrWord}`
      : `${confirmations} ${confWord}`;

  const levelLabel =
    level === "high"
      ? "High confidence"
      : level === "moderate"
        ? "Moderate confidence"
        : "Low confidence";

  return {
    badge: confirmed ? "confirmed" : "unverified",
    level,
    confirmations,
    corrections,
    summary,
    ariaLabel: `${confirmed ? "Confirmed" : "Unverified"}, ${levelLabel}, ${summary}`,
  };
}

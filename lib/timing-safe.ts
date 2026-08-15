/**
 * Timing-safe string compare for secrets (admin login, cron bearer).
 * Length mismatch returns false without calling timingSafeEqual.
 */

import { timingSafeEqual } from "node:crypto";

export function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Authorization: Bearer <secret> — same contract as before. */
export function bearerSecretMatches(
  authorizationHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!authorizationHeader || !secret) return false;
  const prefix = "Bearer ";
  if (!authorizationHeader.startsWith(prefix)) return false;
  return secretsMatch(authorizationHeader.slice(prefix.length), secret);
}

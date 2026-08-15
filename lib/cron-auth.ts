/**
 * Cron route authorization — same headers as before, timing-safe secret compare.
 */

import { bearerSecretMatches, secretsMatch } from "@/lib/timing-safe";

export function authorizeCronRequest(
  request: { headers: { get(name: string): string | null } },
  secret: string,
): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (bearerSecretMatches(header, secret)) return true;
  const cronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronHeader && secretsMatch(cronHeader, secret)) return true;
  return false;
}

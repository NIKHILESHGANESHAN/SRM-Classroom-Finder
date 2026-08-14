/**
 * One-way token fingerprint for admin (V2.6).
 * Never reverse; never display the raw anonymous token.
 */

import { createHash } from "node:crypto";

export function fingerprintToken(token: string): string {
  const hex = createHash("sha256").update(token, "utf8").digest("hex");
  return hex.slice(0, 6);
}

export function formatTokenFingerprint(token: string): string {
  return `Token ${fingerprintToken(token)}…`;
}

export function looksLikeRawUuidToken(text: string): boolean {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
    text,
  );
}

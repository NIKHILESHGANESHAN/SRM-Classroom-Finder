/**
 * Server-only device-token reader (Phase 4).
 *
 * Kept separate from `@/lib/token` so client bundles never import `next/headers`.
 */

import { cookies } from "next/headers";
import { DEVICE_TOKEN_KEY, isValidDeviceToken } from "@/lib/token";

/**
 * Read the anonymous device token from the incoming request cookies.
 * Does not create a token — the client bootstrap (`DeviceTokenBootstrap`) must
 * have run on a prior page load so the cookie exists.
 */
export function getDeviceTokenFromCookies(): string | null {
  const value = cookies().get(DEVICE_TOKEN_KEY)?.value;
  return isValidDeviceToken(value) ? value : null;
}

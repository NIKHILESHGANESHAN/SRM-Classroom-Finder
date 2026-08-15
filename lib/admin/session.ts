/**
 * Admin session cookie (V2.6). Server-only. HMAC over expiry using ADMIN_SECRET.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ADMIN_COOKIE } from "@/lib/admin/edge-session";
import { secretsMatch } from "@/lib/timing-safe";

export { secretsMatch, ADMIN_COOKIE };
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createAdminSessionValue(
  nowMs: number,
  secret: string,
  ttlMs: number = ADMIN_SESSION_MS,
): string {
  const exp = nowMs + ttlMs;
  const payload = `v1:${exp}`;
  return `v1.${exp}.${hmac(payload, secret)}`;
}

export function verifyAdminSessionValue(
  value: string | undefined | null,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  const mac = parts[2] ?? "";
  if (!Number.isFinite(exp) || exp <= nowMs) return false;
  const expected = hmac(`v1:${exp}`, secret);
  return safeEqual(mac, expected);
}

export function isAdminAuthenticated(): boolean {
  const value = cookies().get(ADMIN_COOKIE)?.value;
  return verifyAdminSessionValue(value, env.ADMIN_SECRET);
}

/**
 * Fail closed before any admin data load. `return null` after redirect keeps
 * SWC from compiling this into `auth() || redirect(), pageJsx`.
 */
export function requireAdmin(): void {
  if (isAdminAuthenticated()) return;
  redirect("/admin/login");
}

export function writeAdminSessionCookie(): void {
  const value = createAdminSessionValue(Date.now(), env.ADMIN_SECRET);
  cookies().set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MS / 1000,
  });
}

export function clearAdminSessionCookie(): void {
  cookies().set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

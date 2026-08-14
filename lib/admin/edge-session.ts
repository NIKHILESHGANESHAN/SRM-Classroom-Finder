/**
 * Edge-safe admin session verify (Web Crypto). Matches Node HMAC in session.ts.
 * Used by middleware only — never import next/headers here.
 */

export const ADMIN_COOKIE = "srm_admin_session";

function toBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i += 1) {
    bin += String.fromCharCode(view[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSha256Base64Url(
  payload: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

export async function verifyAdminSessionEdge(
  value: string | undefined | null,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!value || secret.length < 16) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  const mac = parts[2] ?? "";
  if (!Number.isFinite(exp) || exp <= nowMs) return false;
  const expected = await hmacSha256Base64Url(`v1:${exp}`, secret);
  return timingSafeEqualStr(mac, expected);
}

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

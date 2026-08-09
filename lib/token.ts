/**
 * Anonymous device-token helper — browser / shared (Phase 4).
 *
 * There is no login/OTP. Abuse controls and “who submitted this” tracking use a
 * stable UUID per browser profile, stored in BOTH:
 *   - document.cookie  (long-lived) — readable by Server Actions / Route Handlers
 *   - localStorage key `classroomfinder_token` — survives some cookie clears
 *
 * Sync rules (ensureDeviceToken):
 *   1. Both present & equal → use it
 *   2. Both present & differ → prefer cookie (server source of truth), fix LS
 *   3. Only one present → copy to the missing store
 *   4. Neither → generate UUID v4, write both
 *
 * Client: call ensureDeviceToken() / useDeviceToken() before Contribute/Report.
 * Server: import getDeviceTokenFromCookies from `@/lib/token-server`.
 */

/** Shared key for cookie name and localStorage — must stay identical. */
export const DEVICE_TOKEN_KEY = "classroomfinder_token" as const;

/**
 * Cookie lifetime (~400 days). Modern browsers cap persistent cookies around
 * this window; renewing on each visit via ensureDeviceToken keeps it fresh.
 */
export const DEVICE_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Reject empty / garbage values that would break unique constraints later. */
export function isValidDeviceToken(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function generateToken(): string {
  // Web Crypto is available in modern browsers and Node 20+
  return crypto.randomUUID();
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Read the device token from document.cookie (client only). */
export function readCookieToken(): string | null {
  if (!isBrowser()) return null;

  const parts = document.cookie.split(";").map((c) => c.trim());
  for (const part of parts) {
    if (!part.startsWith(`${DEVICE_TOKEN_KEY}=`)) continue;
    const raw = decodeURIComponent(part.slice(DEVICE_TOKEN_KEY.length + 1));
    return isValidDeviceToken(raw) ? raw : null;
  }
  return null;
}

/**
 * Persist token as a first-party cookie readable by the Next.js server.
 * Not HttpOnly — the client must also mirror it into localStorage.
 */
export function writeCookieToken(token: string): void {
  if (!isBrowser() || !isValidDeviceToken(token)) return;

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${DEVICE_TOKEN_KEY}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${DEVICE_TOKEN_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

/** Read token from localStorage (client only). */
export function readLocalStorageToken(): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    return isValidDeviceToken(raw) ? raw : null;
  } catch {
    // Private mode / blocked storage — cookie alone still works for the server
    return null;
  }
}

/** Mirror token into localStorage (client only). */
export function writeLocalStorageToken(token: string): void {
  if (!isBrowser() || !isValidDeviceToken(token)) return;
  try {
    window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch {
    // Ignore quota / privacy mode failures; cookie remains the server path
  }
}

/**
 * Ensure a device token exists and that cookie ↔ localStorage stay in sync.
 * Idempotent: refreshes / remounts reuse the existing UUID.
 *
 * @returns The canonical device token for this browser profile
 */
export function ensureDeviceToken(): string {
  if (!isBrowser()) {
    throw new Error(
      "ensureDeviceToken() must run in the browser (use getDeviceTokenFromCookies from @/lib/token-server on the server).",
    );
  }

  const fromCookie = readCookieToken();
  const fromStorage = readLocalStorageToken();

  // 1–2. Both present
  if (fromCookie && fromStorage) {
    if (fromCookie !== fromStorage) {
      // Prefer cookie — Server Actions will read this value
      writeLocalStorageToken(fromCookie);
      writeCookieToken(fromCookie); // refresh Max-Age
      return fromCookie;
    }
    writeCookieToken(fromCookie); // slide expiry on revisit
    return fromCookie;
  }

  // 3a. Cookie only → mirror to localStorage
  if (fromCookie && !fromStorage) {
    writeLocalStorageToken(fromCookie);
    writeCookieToken(fromCookie);
    return fromCookie;
  }

  // 3b. localStorage only → mirror to cookie
  if (!fromCookie && fromStorage) {
    writeCookieToken(fromStorage);
    writeLocalStorageToken(fromStorage);
    return fromStorage;
  }

  // 4. First visit — mint a new UUID and write both stores
  const token = generateToken();
  writeCookieToken(token);
  writeLocalStorageToken(token);
  return token;
}

/**
 * Read the current token without creating one.
 * Useful when you only want to display / log if already bootstrapped.
 */
export function peekDeviceToken(): string | null {
  if (!isBrowser()) return null;
  return readCookieToken() ?? readLocalStorageToken();
}

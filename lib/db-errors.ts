/**
 * Prisma / PostgreSQL connectivity error classification (Phase 10).
 *
 * Distinguishes transient infrastructure failures from legitimate empty query
 * results and application-level errors. Never map connectivity loss to
 * "no classrooms available."
 */

import { Prisma } from "@prisma/client";

/** Prisma codes for unreachable DB, timeouts, and dropped connections. */
const CONNECTIVITY_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
]);

const CONNECTIVITY_MESSAGE =
  /can't reach database server|connection terminated|connection refused|connection timed out|server closed the connection|econnrefused|etimedout|enotfound|getaddrinfo/i;

/** User-safe copy when live classroom data cannot be fetched. */
export const LIVE_DATA_UNAVAILABLE_MESSAGE =
  "ClassFinder couldn't reach the live classroom service right now. Please try again in a moment, or open Finder directly.";

/** Finder poll/refresh failure — preserves last known good list. */
export const FINDER_REFRESH_FAILED_MESSAGE =
  "Couldn't refresh live data — showing your last loaded list.";

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaInitializationError(
  error: unknown,
): error is Prisma.PrismaClientInitializationError {
  return error instanceof Prisma.PrismaClientInitializationError;
}

/**
 * True when the failure is likely transient DB connectivity (Neon pooler blip,
 * network timeout, etc.) — not a business-rule or query-logic failure.
 */
export function isDatabaseConnectivityError(error: unknown): boolean {
  if (isPrismaKnownRequestError(error)) {
    return CONNECTIVITY_CODES.has(error.code);
  }
  if (isPrismaInitializationError(error)) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return false;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const msg = error.message;
    return CONNECTIVITY_MESSAGE.test(msg);
  }
  if (error instanceof Error) {
    return CONNECTIVITY_MESSAGE.test(error.message);
  }
  return false;
}

/** Strip hostnames / SQL from logged or surfaced error text. */
export function sanitizeErrorForLog(error: unknown): string {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message
    .replace(/@[\w.-]+\.[\w.-]+(?::\d+)?/gi, "@***")
    .replace(/postgresql:\/\/[^\s]+/gi, "postgresql://***")
    .replace(
      /\b(?:ep-[\w-]+(?:\.[\w.-]+)?(?::\d+)?|[\w.-]+\.neon\.tech(?::\d+)?)\b/gi,
      "***",
    )
    .replace(/\bat\s+\S+\.(?:aws\.neon\.tech|neon\.tech)(?::\d+)?/gi, "at ***")
    .slice(0, 240);
}

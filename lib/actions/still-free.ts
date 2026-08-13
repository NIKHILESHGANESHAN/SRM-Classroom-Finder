"use server";

/**
 * Still Free — independent positive confirmation of an existing free_report.
 *
 * DBMS: transaction + UNIQUE (free_report_id, actor_token) on report_events
 * so retries and double-taps cannot spam confirmation_count.
 */

import { applyIndependentConfirmation } from "@/lib/record-confirmation";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { isValidDeviceToken } from "@/lib/token";
import { getDeviceTokenFromCookies } from "@/lib/token-server";

export type StillFreeInput = {
  freeReportId: string;
  deviceToken?: string;
};

export type StillFreeResult =
  | {
      ok: true;
      kind: "confirmed" | "already_reported";
      freeReportId: string;
      confirmationCount: number;
      status: string;
    }
  | { ok: false; error: string };

function resolveToken(clientToken?: string): string | null {
  const fromCookie = getDeviceTokenFromCookies();
  if (fromCookie) return fromCookie;
  if (clientToken && isValidDeviceToken(clientToken)) return clientToken;
  return null;
}

export async function submitStillFree(
  input: StillFreeInput,
): Promise<StillFreeResult> {
  const token = resolveToken(input.deviceToken);
  if (!token) {
    return {
      ok: false,
      error: "Missing device token. Refresh the page and try again.",
    };
  }

  const rl = rateLimit(
    `still-free:${token}`,
    RATE_LIMITS.stillFree.limit,
    RATE_LIMITS.stillFree.windowMs,
  );
  if (!rl.success) {
    logger.warn("still_free.rate_limited", { tokenPrefix: token.slice(0, 8) });
    return {
      ok: false,
      error: "Too many requests. Please wait a moment and try again.",
    };
  }

  if (!input.freeReportId?.trim()) {
    return { ok: false, error: "Missing free report id." };
  }

  try {
    return await prisma.$transaction(async (tx) =>
      applyIndependentConfirmation(tx, {
        freeReportId: input.freeReportId,
        actorToken: token,
        eventType: "still_free",
        rejectIfOccupiedByActor: true,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.error("still_free.submit_failed", { error: message });
    return {
      ok: false,
      error: "Couldn't submit your report.",
    };
  }
}

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { expireFreeReports } from "@/lib/expire-free-reports";
import { logger } from "@/lib/logger";
import {
  RATE_LIMITS,
  getClientIp,
  rateLimit,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Auto-expiry cron — `/api/cron/expire`
 *
 * Vercel Cron (vercel.json) hits this every 5 minutes with:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Local manual run:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3000/api/cron/expire
 */

function authorize(request: Request): boolean {
  const secret = env.CRON_SECRET;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Vercel Cron may also send the secret via this header on some plans
  const cronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronHeader === secret) return true;

  return false;
}

async function handleExpire(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const rl = rateLimit(
    `cron:${ip}`,
    RATE_LIMITS.cron.limit,
    RATE_LIMITS.cron.windowMs,
  );

  if (!rl.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );
    logger.warn("cron.expire", {
      ok: false,
      error: "rate_limited",
      ip,
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  if (!authorize(request)) {
    logger.warn("cron.expire", {
      ok: false,
      error: "unauthorized",
      ip,
    });
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await expireFreeReports();

    logger.info("cron.expire", {
      ok: true,
      expiredCount: result.expiredCount,
      durationMs: result.durationMs,
      ip,
    });

    return NextResponse.json({
      ok: true,
      expiredCount: result.expiredCount,
      durationMs: result.durationMs,
      timestamp: result.timestamp,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown expiry failure";
    logger.error("cron.expire", {
      ok: false,
      error: message,
      ip,
    });
    return NextResponse.json(
      { ok: false, error: "Expiry job failed" },
      { status: 500 },
    );
  }
}

/** Vercel Cron invokes GET by default. */
export async function GET(request: Request) {
  return handleExpire(request);
}

/** Allow POST for local scripts / manual runners. */
export async function POST(request: Request) {
  return handleExpire(request);
}

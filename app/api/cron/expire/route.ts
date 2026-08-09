import { NextResponse } from "next/server";
import { expireFreeReports } from "@/lib/expire-free-reports";

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
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Vercel Cron may also send the secret via this header on some plans
  const cronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronHeader === secret) return true;

  return false;
}

async function handleExpire(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    console.error(
      JSON.stringify({
        event: "cron.expire",
        ok: false,
        error: "CRON_SECRET is not configured",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: CRON_SECRET missing" },
      { status: 500 },
    );
  }

  if (!authorize(request)) {
    console.warn(
      JSON.stringify({
        event: "cron.expire",
        ok: false,
        error: "unauthorized",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await expireFreeReports();

    console.info(
      JSON.stringify({
        event: "cron.expire",
        ok: true,
        expiredCount: result.expiredCount,
        durationMs: result.durationMs,
        timestamp: result.timestamp,
      }),
    );

    return NextResponse.json({
      ok: true,
      expiredCount: result.expiredCount,
      durationMs: result.durationMs,
      timestamp: result.timestamp,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown expiry failure";
    console.error(
      JSON.stringify({
        event: "cron.expire",
        ok: false,
        error: message,
        timestamp: new Date().toISOString(),
      }),
    );
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

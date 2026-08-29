import { NextResponse } from "next/server";
import {
  isDatabaseConnectivityError,
  sanitizeErrorForLog,
} from "@/lib/db-errors";
import { getFinderRefreshData } from "@/lib/finder-data";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Minimal Finder refresh payload (rooms + coverage).
 * Does not return device tokens or contributor identifiers.
 */
export async function GET(request: Request) {
  const started = Date.now();
  const url = new URL(request.url);
  const building = url.searchParams.get("building");
  const floor = url.searchParams.get("floor");
  const slot = url.searchParams.get("slot");

  try {
    const data = await getFinderRefreshData({
      buildingId: building,
      floorId: floor,
      timeSlotId: slot === null ? undefined : slot,
    });

    logger.info("finder.refresh", {
      ok: true,
      roomCount: data.rooms.length,
      durationMs: Date.now() - started,
    });

    return NextResponse.json(
      {
        ok: true,
        rooms: data.rooms,
        coverage: data.coverage,
        currentSlotId: data.currentSlotId,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    logger.error("finder.refresh", {
      ok: false,
      connectivity: isDatabaseConnectivityError(error),
      error: sanitizeErrorForLog(error),
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to refresh Finder data." },
      { status: 500 },
    );
  }
}

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Short-lived caches for dimension data that changes rarely (admin inventory edits).
 * Live availability (free_reports, active_free_classrooms) is never cached here.
 *
 * Classification:
 * - Time slot definitions → safe to cache (seed data; changes only via migration)
 * - Building + floor metadata → short revalidation (admin may add floors/buildings)
 * - Classroom isActive / contribute tree → NOT cached (must stay dynamic)
 */

const BUILDING_CATALOG_REVALIDATE_SECONDS = 300;

/** Campus period definitions — static after seed/migration. */
export const getCachedTimeSlots = unstable_cache(
  async () => prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } }),
  ["catalog-time-slots"],
  { revalidate: 3600 },
);

/** Building + floor list for Finder filters (no classroom rows). */
export const getCachedFinderBuildings = unstable_cache(
  async () =>
    prisma.building.findMany({
      orderBy: { code: "asc" },
      include: {
        floors: {
          orderBy: { floorNumber: "asc" },
          select: { id: true, floorNumber: true },
        },
      },
    }),
  ["catalog-finder-buildings"],
  { revalidate: BUILDING_CATALOG_REVALIDATE_SECONDS },
);

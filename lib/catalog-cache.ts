import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Short-lived caches for dimension data that changes rarely.
 * Live availability (free_reports, active_free_classrooms) is never cached here.
 *
 * Classification:
 * - Time slot definitions → safe to cache (seed data; changes only via migration)
 * - Building + floor metadata → short revalidation (admin may add floors/buildings)
 * - Contribute building/floor/classroom tree → cached with revalidation;
 *   isActive changes are rare (no /admin/inventory mutation path in V4/V5)
 *
 * Invalidation: time-based revalidation only. V4 removed admin inventory UI;
 * catalog mutations require seed/DB ops — cache expires within revalidate window.
 *
 * `load*` functions are uncached Prisma reads (scripts / fallback).
 * `getCatalog*` uses unstable_cache inside Next.js; falls back to `load*` when
 * incrementalCache is unavailable (tsx scripts outside request context).
 */

const BUILDING_CATALOG_REVALIDATE_SECONDS = 300;

const INCREMENTAL_CACHE_MISSING = "incrementalCache";

/** Campus period definitions — static after seed/migration. */
export async function loadTimeSlots() {
  return prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } });
}

/** Building + floor list for Finder filters (no classroom rows). */
export async function loadFinderBuildings() {
  return prisma.building.findMany({
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { floorNumber: "asc" },
        select: { id: true, floorNumber: true },
      },
    },
  });
}

/** Full building → floor → active classroom tree for Contributor wizard. */
export async function loadContributeBuildings() {
  return prisma.building.findMany({
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { floorNumber: "asc" },
        select: {
          id: true,
          floorNumber: true,
          classrooms: {
            where: { isActive: true },
            orderBy: { roomNumber: "asc" },
            select: { id: true, roomNumber: true },
          },
        },
      },
    },
  });
}

function isIncrementalCacheUnavailable(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(INCREMENTAL_CACHE_MISSING)
  );
}

/** Wrap unstable_cache; fall back to loader when Next incrementalCache is unavailable (tsx scripts). */
export function withCatalogCacheFallback<TArgs extends readonly unknown[], TResult>(
  loader: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  revalidate: number,
): (...args: TArgs) => Promise<TResult> {
  const cached = unstable_cache(loader, keyParts, { revalidate });
  return async (...args: TArgs) => {
    try {
      return await cached(...args);
    } catch (error) {
      if (isIncrementalCacheUnavailable(error)) {
        return loader(...args);
      }
      throw error;
    }
  };
}

export const getCatalogTimeSlots = withCatalogCacheFallback(
  loadTimeSlots,
  ["catalog-time-slots"],
  3600,
);

export const getCatalogFinderBuildings = withCatalogCacheFallback(
  loadFinderBuildings,
  ["catalog-finder-buildings"],
  BUILDING_CATALOG_REVALIDATE_SECONDS,
);

export const getCatalogContributeBuildings = withCatalogCacheFallback(
  loadContributeBuildings,
  ["catalog-contribute-buildings"],
  BUILDING_CATALOG_REVALIDATE_SECONDS,
);

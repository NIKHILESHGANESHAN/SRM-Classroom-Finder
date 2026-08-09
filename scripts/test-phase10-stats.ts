/**
 * Phase 10 smoke — run Stats aggregates and assert shapes.
 * Usage: npx tsx scripts/test-phase10-stats.ts
 */
import { getStatsPageData } from "../lib/stats-data";

async function main() {
  const data = await getStatsPageData();
  console.log(
    JSON.stringify(
      {
        campusToday: data.campusToday,
        weekStart: data.weekStart,
        hasAnyData: data.hasAnyData,
        totals: data.totals,
        busiestBuildingToday: data.busiestBuildingToday,
        mostActiveSlotThisWeek: data.mostActiveSlotThisWeek,
        reportsPerBuilding: data.reportsPerBuilding,
        avgConfirmationsThisWeek: data.avgConfirmationsThisWeek,
        statusBreakdownThisWeek: data.statusBreakdownThisWeek,
        topClassroomsThisWeek: data.topClassroomsThisWeek,
      },
      null,
      2,
    ),
  );

  if (!data.hasAnyData) {
    throw new Error("Expected seeded stats data — run scripts/seed-stats-data.ts");
  }
  if (data.totals.thisWeek < 1) {
    throw new Error("expected week total >= 1");
  }
  if (data.reportsPerBuilding.length !== 3) {
    throw new Error("expected 3 buildings in chart series");
  }
  if (!data.busiestBuildingToday) {
    throw new Error("expected busiest building today");
  }
  if (!data.mostActiveSlotThisWeek) {
    throw new Error("expected most active slot this week");
  }
  if (data.avgConfirmationsThisWeek === null) {
    throw new Error("expected avg confirmations");
  }
  if (data.statusBreakdownThisWeek.length < 1) {
    throw new Error("expected status breakdown");
  }

  console.log("Phase 10 stats smoke tests PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

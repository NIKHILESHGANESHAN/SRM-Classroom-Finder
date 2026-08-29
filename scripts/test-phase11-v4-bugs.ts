/**
 * Phase 11 V4 bug regression tests (deterministic, no DB required).
 * Run: npx tsx scripts/test-phase11-v4-bugs.ts
 */

import { formatReportExpiresAt, isAnomalousReportExpiry } from "../lib/admin/format-report-expiry";
import { getAppVersion } from "../lib/app-version";
import { shouldShowFinderMorningNote } from "../lib/finder-morning-note-logic";
import { buildExpiresAt } from "../lib/slots";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  section("Morning Easter Egg visibility");
  assert(
    shouldShowFinderMorningNote({
      visibleRoomCount: 0,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 5 * 60 + 19,
    }),
    "05:19 IST with zero rooms",
  );
  assert(
    !shouldShowFinderMorningNote({
      visibleRoomCount: 0,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 7 * 60 + 51,
    }),
    "07:51 not morning",
  );
  assert(
    !shouldShowFinderMorningNote({
      visibleRoomCount: 0,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 3 * 60 + 59,
    }),
    "03:59 night not morning",
  );
  assert(
    !shouldShowFinderMorningNote({
      visibleRoomCount: 2,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 5 * 60 + 19,
    }),
    "hidden when rooms visible",
  );
  assert(
    shouldShowFinderMorningNote({
      visibleRoomCount: 0,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 4 * 60,
    }),
    "04:00 boundary",
  );
  assert(
    shouldShowFinderMorningNote({
      visibleRoomCount: 0,
      hasSearch: false,
      mineOnly: false,
      nowMinutes: 7 * 60 + 50,
    }),
    "07:50 boundary",
  );
  console.log("ok  morning note no longer gated on none_free coverage");

  section("Report expiry formatting");
  const built = buildExpiresAt("2026-08-28", 8 * 60 + 50);
  const label = formatReportExpiresAt(built.toISOString());
  assert(label.includes("2026"), "includes year");
  assert(label.includes("8:50") || label.includes("08:50"), `slot end label: ${label}`);
  assert(
    isAnomalousReportExpiry("2099-01-01T00:00:00.000Z", "2026-08-27"),
    "2099 sentinel flagged",
  );
  assert(
    isAnomalousReportExpiry("2000-01-01T00:00:00.000Z", "2026-08-27"),
    "2000 sentinel flagged",
  );
  assert(
    !isAnomalousReportExpiry(built.toISOString(), "2026-08-28"),
    "valid built expiry ok",
  );
  console.log("ok  admin expiry format uses campus wall-clock + year");

  section("App version");
  assert(getAppVersion() === "4.0.0", "package.json version surfaced");
  console.log("ok  app version");

  console.log("\nPhase 11 V4 bug tests passed.\n");
}

main();

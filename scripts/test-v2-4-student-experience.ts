/**
 * V2.4 student experience tests (share, favorites, recents, deep links).
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-4-student-experience.ts
 */

import { PrismaClient } from "@prisma/client";
import { lookupActiveClassroom, lookupActiveClassroomByPlace } from "../lib/classroom-lookup";
import {
  buildClassroomSharePath,
  buildClassroomShareUrl,
  shareClassroomLink,
  shareUrlContainsSecrets,
} from "../lib/classroom-share";
import { getFinderPageData, resolveFinderDeepLink } from "../lib/finder-data";
import {
  parseFavoriteCodes,
  parseRecentRooms,
  prioritizeFavoriteBuildings,
  pushRecentRoom,
  serializeFavoriteCodes,
  toggleFavoriteCode,
  MAX_RECENT_ROOMS,
} from "../lib/local-preferences";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  try {
    section("Share URL — human-readable, no secrets");
    const path = buildClassroomSharePath({
      buildingCode: "UB",
      floorNumber: 12,
      roomNumber: "1205",
    });
    assert(path === "/finder?building=UB&floor=12&room=1205", `path ${path}`);
    const url = buildClassroomShareUrl("https://example.edu", {
      buildingCode: "ub",
      floorNumber: 12,
      roomNumber: "1205",
    });
    assert(url.includes("building=UB"), "code uppercased");
    assert(!shareUrlContainsSecrets(url), "no secrets");
    assert(!url.includes("token"), "no token");
    assert(!url.includes("freeReport"), "no report id");
    console.log("ok  share path");

    section("Web Share + clipboard + cancel");
    const input = {
      origin: "https://example.edu",
      buildingCode: "UB",
      floorNumber: 12,
      roomNumber: "1205",
    };
    const shared = await shareClassroomLink(input, {
      canShare: () => true,
      share: async () => undefined,
      writeClipboard: async () => {
        throw new Error("should not copy");
      },
    });
    assert(shared === "shared", "web share used");

    const cancelled = await shareClassroomLink(input, {
      canShare: () => true,
      share: async () => {
        const err = new Error("cancel");
        err.name = "AbortError";
        throw err;
      },
      writeClipboard: async () => {
        throw new Error("should not copy");
      },
    });
    assert(cancelled === "cancelled", "user cancel");

    let copiedText = "";
    const copied = await shareClassroomLink(input, {
      canShare: () => false,
      share: async () => undefined,
      writeClipboard: async (text) => {
        copiedText = text;
      },
    });
    assert(copied === "copied", "clipboard fallback");
    assert(copiedText.endsWith("/finder?building=UB&floor=12&room=1205"), copiedText);

    const failed = await shareClassroomLink(input, {
      canShare: () => false,
      share: async () => undefined,
      writeClipboard: async () => {
        throw new Error("denied");
      },
    });
    assert(failed === "failed", "clipboard failure");

    const shareThenCopy = await shareClassroomLink(input, {
      canShare: () => true,
      share: async () => {
        throw new Error("share unavailable");
      },
      writeClipboard: async () => undefined,
    });
    assert(shareThenCopy === "copied", "share error falls back to clipboard");
    console.log("ok  share adapters");

    section("Favorites localStorage parsers");
    const allowed = ["UB", "TP1", "TP2"];
    assert(parseFavoriteCodes(null, allowed).length === 0, "empty");
    assert(parseFavoriteCodes("{not json", allowed).length === 0, "malformed");
    assert(
      parseFavoriteCodes(JSON.stringify({ codes: ["UB", "NOPE", "ub", 12] }), allowed).join(",") ===
        "UB",
      "invalid + duplicate dropped",
    );
    const toggled = toggleFavoriteCode([], "TP1", allowed);
    assert(toggled.join(",") === "TP1", "favorite TP1 without rooms");
    assert(toggleFavoriteCode(toggled, "TP1", allowed).length === 0, "unfavorite");
    assert(
      parseFavoriteCodes(serializeFavoriteCodes(["UB", "TP2"]), allowed).join(",") === "UB,TP2",
      "roundtrip",
    );
    console.log("ok  favorites");

    section("Recent rooms");
    assert(parseRecentRooms("nope").length === 0, "malformed recents");
    let recents = pushRecentRoom([], {
      buildingCode: "UB",
      floorNumber: 12,
      roomNumber: "1205",
      savedAt: 100,
    });
    recents = pushRecentRoom(recents, {
      buildingCode: "TP2",
      floorNumber: 5,
      roomNumber: "504",
      savedAt: 200,
    });
    recents = pushRecentRoom(recents, {
      buildingCode: "UB",
      floorNumber: 12,
      roomNumber: "1205",
      savedAt: 300,
    });
    assert(recents[0]?.roomNumber === "1205", "newest first");
    assert(recents.length === 2, "deduped");
    let many = recents;
    for (let i = 0; i < 12; i++) {
      many = pushRecentRoom(many, {
        buildingCode: "UB",
        floorNumber: 5,
        roomNumber: `R${i}`,
        savedAt: 400 + i,
      });
    }
    assert(many.length === MAX_RECENT_ROOMS, "capped");
    const sorted = prioritizeFavoriteBuildings(
      [
        { buildingCode: "TP2" },
        { buildingCode: "UB" },
        { buildingCode: "TP1" },
      ],
      ["UB"],
    );
    assert(sorted[0]?.buildingCode === "UB", "favorites first");
    console.log("ok  recent rooms");

    section("Deep links + V2.1 integrity");
    const ubPage = await getFinderPageData({
      buildingId: "UB",
      floorId: "12",
    });
    const ub = ubPage.buildings.find((b) => b.code === "UB");
    const ub12 = ub?.floors.find((f) => f.floorNumber === 12);
    if (!ub || !ub12) throw new Error("FAIL: UB floor 12 resolved from codes");
    assert(ubPage.applied.buildingId === ub.id, "applied building id");
    assert(ubPage.applied.floorId === ub12.id, "applied floor id");

    const okLink = await resolveFinderDeepLink({
      buildings: ubPage.buildings,
      applied: ubPage.applied,
      roomRaw: "1205",
    });
    assert(okLink?.inventoryOk === true, "UB 12 1205 listed");

    const badLink = await resolveFinderDeepLink({
      buildings: ubPage.buildings,
      applied: ubPage.applied,
      roomRaw: "504",
    });
    assert(badLink?.inventoryOk === false, "UB 12 504 not listed");

    const reject = await lookupActiveClassroom({
      buildingId: ub.id,
      floorId: ub12.id,
      classroomId: (
        await prisma.classroom.findFirstOrThrow({
          where: { buildingId: ub.id, roomNumber: "504", isActive: true },
        })
      ).id,
    });
    assert(!reject.ok, "UB12 + 504 classroom id rejected");

    const room1205 = await prisma.classroom.findFirstOrThrow({
      where: {
        buildingId: ub.id,
        floorId: ub12.id,
        roomNumber: "1205",
        isActive: true,
      },
    });
    const byPlace = await lookupActiveClassroomByPlace({
      buildingId: ub.id,
      floorId: ub12.id,
      roomNumber: "1205",
    });
    assert(byPlace.ok && byPlace.classroom.id === room1205.id, "place lookup 1205");
    const byPlace504 = await lookupActiveClassroomByPlace({
      buildingId: ub.id,
      floorId: ub12.id,
      roomNumber: "504",
    });
    assert(!byPlace504.ok, "place lookup 504 on UB12 rejected");

    const tp2Page = await getFinderPageData({
      buildingId: "TP2",
      floorId: "5",
    });
    const tp2 = tp2Page.buildings.find((b) => b.code === "TP2");
    const tp2f5 = tp2?.floors.find((f) => f.floorNumber === 5);
    if (!tp2 || !tp2f5) throw new Error("FAIL: TP2 floor 5");
    const tp2504 = await lookupActiveClassroomByPlace({
      buildingId: tp2.id,
      floorId: tp2f5.id,
      roomNumber: "504",
    });
    assert(tp2504.ok, "TP2 5 504 accepted");

    const tp1Page = await getFinderPageData({
      buildingId: "TP1",
      floorId: "1",
    });
    assert(tp1Page.coverage.kind === "inventory_gap", "TP1 gap");
    const tp1Link = await resolveFinderDeepLink({
      buildings: tp1Page.buildings,
      applied: tp1Page.applied,
      roomRaw: "101",
    });
    assert(tp1Link?.inventoryOk === false, "TP1 invented room rejected");
    console.log("ok  deep links / inventory");

    console.log("\nV2.4 student experience tests passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

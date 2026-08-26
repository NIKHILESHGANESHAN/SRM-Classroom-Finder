/**
 * Phase 10.2 — Admin inventory add UX + Help identity refinement.
 * Run: npx tsx scripts/test-v2-8-phase-10-2.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildInventoryExistingKey,
  getAddableRoomsForFloor,
  isFloorFullyListed,
} from "../lib/admin/inventory-add";
import { parseLiveHelpIntent } from "../lib/help/live-intent";
import { answerHelpQuestion } from "../lib/help/scope";
import {
  CLASSROOM_INVENTORY,
  isOfficialInventoryRoom,
} from "../prisma/data/classroom-inventory";

const root = join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  section("Admin — addable room filtering");
  const existingKey = buildInventoryExistingKey([
    { buildingCode: "UB", floorNumber: 6, roomNumber: "601" },
    { buildingCode: "UB", floorNumber: 6, roomNumber: "602" },
    { buildingCode: "UB", floorNumber: 6, roomNumber: "603" },
  ]);
  const addable = getAddableRoomsForFloor("UB", 6, existingKey);
  assert(addable.includes("604"), "604 addable");
  assert(addable.includes("605"), "605 addable");
  assert(!addable.includes("601"), "601 not addable");
  assert(!addable.includes("602"), "602 not addable");
  assert(!addable.includes("603"), "603 not addable");
  console.log("ok  missing official rooms are addable");

  section("Admin — inactive row still blocks duplicate add");
  const withInactive = buildInventoryExistingKey([
    { buildingCode: "UB", floorNumber: 6, roomNumber: "601" },
    { buildingCode: "UB", floorNumber: 6, roomNumber: "604" },
  ]);
  const afterInactive = getAddableRoomsForFloor("UB", 6, withInactive);
  assert(!afterInactive.includes("601"), "active row blocks");
  assert(!afterInactive.includes("604"), "inactive row blocks");
  assert(afterInactive.includes("602"), "602 still addable");
  console.log("ok  inactive treated as existing");

  section("Admin — floor fully listed empty state");
  const allUb6Rooms = CLASSROOM_INVENTORY.UB[6] ?? [];
  const allUb6 = buildInventoryExistingKey(
    allUb6Rooms.map((roomNumber) => ({
      buildingCode: "UB",
      floorNumber: 6,
      roomNumber,
    })),
  );
  assert(
    isFloorFullyListed("UB", 6, allUb6),
    "UB floor 6 fully listed when all official rooms exist",
  );
  assert(
    getAddableRoomsForFloor("UB", 6, allUb6).length === 0,
    "no addable rooms when full",
  );
  console.log("ok  fully listed floor");

  section("Admin — server protections preserved (static)");
  const adminActionSrc = readFileSync(
    join(root, "lib/actions/admin.ts"),
    "utf8",
  );
  assert(adminActionSrc.includes("isAdminAuthenticated()"), "require admin");
  assert(adminActionSrc.includes('buildingCode === "TP1"'), "TP1 blocked");
  assert(adminActionSrc.includes("isOfficialInventoryRoom"), "inventory guard");
  assert(adminActionSrc.includes('code === "P2002"'), "duplicate protection");
  console.log("ok  server action guards");

  section("Admin — UI shows only addable rooms");
  const formSrc = readFileSync(
    join(root, "components/admin/classroom-add-form.tsx"),
    "utf8",
  );
  assert(formSrc.includes("getAddableRoomsForFloor"), "uses addable helper");
  assert(
    !formSrc.includes("already listed"),
    "no disabled already-listed options",
  );
  assert(
    formSrc.includes("All official classrooms on this floor are already in inventory."),
    "empty state copy",
  );
  assert(formSrc.includes("router.refresh()"), "refresh after success");
  console.log("ok  add form UX");

  section("Admin — TP1 / non-official inventory rules");
  assert(!isOfficialInventoryRoom("TP1", 1, "101"), "TP1 not in inventory");
  assert(isOfficialInventoryRoom("UB", 6, "604"), "UB 604 official");
  assert(!isOfficialInventoryRoom("UB", 6, "999"), "999 not official");
  console.log("ok  inventory source unchanged");

  section("Help — identity questions");
  const identityCases: Array<[string, string]> = [
    ["Who built you?", "start-who-built"],
    ["Who made you?", "start-who-built"],
    ["Who created ClassFinder?", "start-who-built"],
    ["Who developed ClassFinder?", "start-who-built"],
    ["Who is behind ClassFinder?", "start-who-built"],
    ["Is ClassFinder student built?", "start-who-built"],
    ["Who owns ClassFinder?", "start-who-owns"],
    ["owned by?", "start-who-owns"],
    ["What is ClassFinder?", "start-what-is"],
    ["Why was ClassFinder created?", "start-who-built"],
  ];
  for (const [question, entryId] of identityCases) {
    const reply = answerHelpQuestion(question);
    assert(reply.kind === "answer", `${question} kind=${reply.kind}`);
    assert(reply.entryId === entryId, `${question} → ${reply.entryId}`);
  }
  const ipl = answerHelpQuestion("Who will win the IPL?");
  assert(ipl.kind === "out_of_scope", "IPL out of scope");
  console.log("ok  identity knowledge");

  section("Help — follow-up room context");
  const first = parseLiveHelpIntent("Is UB 301 free?");
  assert(first?.kind === "room", "UB 301 room intent");
  if (first?.kind === "room") {
    assert(first.buildingCode === "UB", "building UB");
    assert(first.roomNumber === "301", "room 301");
  }
  const follow = parseLiveHelpIntent("302?", {
    buildingCode: "UB",
    roomNumber: "301",
  });
  assert(follow?.kind === "room", "302? follow-up");
  if (follow?.kind === "room") {
    assert(follow.buildingCode === "UB", "follow-up building");
    assert(follow.roomNumber === "302", "follow-up room");
  }
  assert(
    parseLiveHelpIntent("Free rooms in UB?")?.kind === "building",
    "building intent preserved",
  );
  assert(
    parseLiveHelpIntent("Free rooms on UB floor 3")?.kind === "floor",
    "floor intent preserved",
  );
  console.log("ok  live intent regressions");

  console.log("\nPhase 10.2 tests passed.");
}

main();

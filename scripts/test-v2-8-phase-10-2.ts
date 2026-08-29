/**
 * Phase 10.2 — Help identity refinement (+ production inventory rules).
 * Run: npx tsx scripts/test-v2-8-phase-10-2.ts
 */

import { parseLiveHelpIntent } from "../lib/help/live-intent";
import { answerHelpQuestion } from "../lib/help/scope";
import { isOfficialInventoryRoom } from "../prisma/data/classroom-inventory";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  section("Production inventory rules");
  assert(isOfficialInventoryRoom("TP1", 1, "101"), "TP1 101 official");
  assert(!isOfficialInventoryRoom("TP1", 1, "104"), "TP1 104 not official");
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

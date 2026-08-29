/**
 * V5 Phase 6 — Easter Egg entry actions, XO close navigation, rounded UI polish.
 * Run: npx tsx scripts/test-v5-phase-6.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  openXoEasterEgg,
  subscribeXoEasterEggOpen,
  XO_EASTER_EGG_OPEN_EVENT,
} from "@/lib/open-xo-easter-egg";
import { isMorningEasterEgg } from "@/lib/easter-egg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

section("Easter Egg entry actions");
const entryActions = read("components/easter-egg/easter-egg-entry-actions.tsx");
assert(entryActions.includes("Play XO"), "Play XO label");
assert(entryActions.includes('aria-label="Go home"'), "Home aria-label");
assert(entryActions.includes('router.push("/")'), "Home navigates to landing");
assert(entryActions.includes("openXoEasterEgg"), "Play XO opens global XO dialog");
assert(!entryActions.includes("Back to Finder"), "no Back to Finder in entry actions");
console.log("ok  EasterEggEntryActions");

const afterHours = read("components/contribute/contribute-after-hours.tsx");
const nightEgg = read("components/contribute/contribute-night.tsx");
assert(afterHours.includes("EasterEggEntryActions"), "evening egg uses entry actions");
assert(nightEgg.includes("EasterEggEntryActions"), "night egg uses entry actions");
assert(!afterHours.includes("Back to Finder"), "evening egg removed Back to Finder");
assert(!nightEgg.includes("Back to Finder"), "night egg removed Back to Finder");
assert(!afterHours.includes('href="/finder"'), "evening egg no Finder link");
assert(!nightEgg.includes('href="/finder"'), "night egg no Finder link");
assert(!afterHours.includes('href="/contribute"'), "evening egg no Report link");
console.log("ok  contribute Easter Egg gates");

section("Morning Easter Egg exception");
const morningNote = read("components/finder/finder-morning-note.tsx");
assert(!morningNote.includes("Play XO"), "morning note has no Play XO");
assert(!morningNote.includes("EasterEggEntryActions"), "morning note has no entry actions");
assert(isMorningEasterEgg(4 * 60), "04:00 is morning phase");
console.log("ok  morning Easter Egg unchanged");

section("XO open bridge");
if (typeof window !== "undefined") {
  let opened = false;
  const unsubscribe = subscribeXoEasterEggOpen(() => {
    opened = true;
  });
  openXoEasterEgg();
  assert(opened, "openXoEasterEgg dispatches listener");
  unsubscribe();
} else {
  assert(typeof openXoEasterEgg === "function", "openXoEasterEgg export");
  assert(typeof subscribeXoEasterEggOpen === "function", "subscribe export");
}
assert(XO_EASTER_EGG_OPEN_EVENT === "cf:open-xo-easter-egg", "event name stable");
console.log("ok  open XO event bridge");

const deferred = read("components/easter-egg/xo-easter-egg-deferred.tsx");
assert(deferred.includes("subscribeXoEasterEggOpen"), "deferred listens for open event");
assert(!deferred.includes("trackUnlockSequence"), "keyboard XO unlock removed");
assert(!deferred.includes("keydown"), "no global keydown unlock listener");
console.log("ok  deferred XO listener (Play XO only)");

section("XO close navigates Home");
const xoDialog = read("components/easter-egg/xo-easter-egg-dialog.tsx");
assert(xoDialog.includes('router.push("/")'), "XO close navigates home");
assert(!xoDialog.includes('router.push("/finder")'), "XO does not navigate to Finder");
console.log("ok  XO close → home");

section("Landing hero logo");
const landing = read("components/landing-actions.tsx");
assert(!landing.includes('size="hero"'), "hero logo removed from landing");
assert(landing.includes("ClassFinderBrand"), "navbar brand retained");
console.log("ok  duplicate hero logo removed");

section("XO board cells stay square");
const xoGame = read("components/easter-egg/xo-game.tsx");
assert(xoGame.includes("rounded-button"), "XO cells use rounded-button corners");
assert(xoGame.includes("aspect-square"), "XO cells remain square");
assert(!xoGame.includes("rounded-none"), "XO cells are not sharp-corner squares");
console.log("ok  XO board geometry preserved");

section("Rounded UI tokens");
const globals = read("app/globals.css");
assert(globals.includes("--radius-button"), "radius-button token exists");
assert(globals.includes("border-radius: var(--radius-button)"), "clear glass uses radius-button");
const glassControl = read("components/glass/glass-control.tsx");
assert(glassControl.includes("rounded-button"), "glass controls use rounded-button");
const select = read("components/ui/select.tsx");
assert(select.includes("rounded-button"), "select trigger uses rounded-button");
const finderFilters = read("components/finder/finder-filters.tsx");
assert(finderFilters.includes("rounded-button"), "finder filters use rounded-button");
console.log("ok  rounded UI polish");

console.log("\nV5 Phase 6 tests passed.");

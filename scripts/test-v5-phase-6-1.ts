/**
 * V5 Phase 6.1 — remove X+O test trigger; brand links home.
 * Run: npx tsx scripts/test-v5-phase-6-1.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

console.log("\n=== V5 Phase 6.1 ===");

const deferred = read("components/easter-egg/xo-easter-egg-deferred.tsx");
assert(!deferred.includes("trackUnlockSequence"), "no keyboard unlock tracking");
assert(!deferred.includes("keydown"), "no document keydown listener");
assert(!deferred.includes("isEditableKeyboardTarget"), "no editable target guard in deferred");
assert(deferred.includes("subscribeXoEasterEggOpen"), "Play XO bridge retained");
console.log("ok  X+O test trigger removed");

const brand = read("components/brand/classfinder-brand.tsx");
assert(brand.includes('href="/"'), "ClassFinderBrand links home");
assert(brand.includes('aria-label="ClassFinder home"'), "ClassFinderBrand accessible name");
assert(brand.includes("SoundLink"), "ClassFinderBrand uses navigation sound link");
console.log("ok  ClassFinderBrand home link");

const navTitle = read("components/brand/classfinder-nav-title.tsx");
assert(navTitle.includes('href="/"'), "ClassFinderNavTitle can link home");
assert(navTitle.includes('aria-label="ClassFinder home"'), "ClassFinderNavTitle accessible name");
assert(navTitle.includes("linkHome"), "ClassFinderNavTitle supports linkHome opt-out");
console.log("ok  ClassFinderNavTitle home link");

console.log("\nV5 Phase 6.1 tests passed.");

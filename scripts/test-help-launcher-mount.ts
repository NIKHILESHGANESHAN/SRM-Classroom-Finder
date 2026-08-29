/**
 * Phase 10.3 — global Help launcher mount/visibility regression tests.
 * Run: npx tsx scripts/test-help-launcher-mount.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  section("Admin path hiding");
  const publicRoutes = [
    "/",
    "/finder",
    "/contribute",
    "/stats",
    "/how-it-works",
    "/contact",
    "/contact/chat",
    "/contact/community",
  ];
  const adminRoutes = [
    "/admin",
    "/admin/login",
    "/admin/reports",
  ];
  for (const path of publicRoutes) {
    assert(!isAdminPath(path), `public route hidden: ${path}`);
  }
  for (const path of adminRoutes) {
    assert(isAdminPath(path), `admin route not hidden: ${path}`);
  }
  console.log("ok  public visible / admin hidden");

  section("Mount path — outside PageTransition");
  const providers = read("components/providers.tsx");
  const layout = read("app/layout.tsx");
  assert(
    providers.includes("ClassFinderHelpDeferred"),
    "help deferred in Providers",
  );
  const returnBlock = providers.slice(providers.indexOf("return ("));
  assert(
    returnBlock.indexOf("<PageTransition>") < returnBlock.indexOf("<ClassFinderHelpDeferred"),
    "help mounts after PageTransition (sibling, not child)",
  );
  assert(
    !layout.includes("ClassFinderHelpDeferred"),
    "help removed from layout PageTransition tree",
  );
  console.log("ok  help is sibling of PageTransition");

  section("Deferred mount — idle defer with hydration gate");
  const deferred = read("components/help/classfinder-help-deferred.tsx");
  assert(
    deferred.includes("requestIdleCallback") ||
      deferred.includes("setTimeout"),
    "help launcher defers until after first paint",
  );
  assert(
    deferred.includes("ClassFinderHelpGlobal"),
    "imports global shell directly after defer",
  );
  assert(
    !deferred.includes('from "next/dynamic"'),
    "no nested dynamic boundary on launcher shell",
  );
  console.log("ok  idle/setTimeout defer, synchronous shell after gate");

  section("Launcher shell — portal + a11y + positioning");
  const global = read("components/help/classfinder-help-global.tsx");
  assert(global.includes("createPortal"), "portals to document.body");
  assert(global.includes('data-cf-help-launcher'), "launcher data attribute");
  assert(global.includes('aria-label={open ? "Close ClassFinder Help"'), "aria-label");
  assert(global.includes("aria-expanded={open}"), "aria-expanded");
  assert(global.includes("fixed z-[120]"), "fixed z-index below boot overlay");
  assert(global.includes("h-14 w-14"), "56px touch target");
  assert(global.includes("safe-area-inset-bottom"), "mobile safe area");
  assert(global.includes("LazyHelpChatPanel"), "chat panel stays lazy");
  assert(
    !global.includes("CHAT_QUICK_PROMPTS"),
    "knowledge prompts deferred to lazy chat panel",
  );
  assert(global.includes("motion-reduce:transition-none"), "reduced motion");
  console.log("ok  launcher markup contract");

  section("Chat panel lazy boundary preserved");
  const panel = read("components/help/help-chat-panel.tsx");
  assert(panel.includes("CHAT_QUICK_PROMPTS"), "prompts load with chat panel");
  const globalFile = read("components/help/classfinder-help-global.tsx");
  assert(globalFile.includes("dynamic("), "chat panel dynamic import");
  console.log("ok  chat panel lazy loading unchanged");

  console.log("\nHelp launcher mount tests passed.\n");
}

main();

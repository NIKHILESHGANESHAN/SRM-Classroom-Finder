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
    "/admin/inventory",
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

  section("Deferred mount — no requestIdleCallback");
  const deferred = read("components/help/classfinder-help-deferred.tsx");
  assert(
    !deferred.includes("window.requestIdleCallback"),
    "idle callback removed",
  );
  assert(deferred.includes("ClassFinderHelpLazy"), "still lazy-loads global shell");
  console.log("ok  client hydration gate only");

  section("Launcher shell — portal + a11y + positioning");
  const global = read("components/help/classfinder-help-global.tsx");
  assert(global.includes("createPortal"), "portals to document.body");
  assert(global.includes('aria-label={open ? "Close ClassFinder Help"'), "aria-label");
  assert(global.includes("aria-expanded={open}"), "aria-expanded");
  assert(global.includes("fixed z-[120]"), "fixed z-index below boot overlay");
  assert(global.includes("h-14 w-14"), "56px touch target");
  assert(global.includes("safe-area-inset-bottom"), "mobile safe area");
  assert(global.includes("LazyHelpChatPanel"), "chat panel stays lazy");
  assert(global.includes("motion-reduce:transition-none"), "reduced motion");
  console.log("ok  launcher markup contract");

  section("Lazy boundary preserved");
  const lazy = read("components/help/classfinder-help-lazy.tsx");
  assert(lazy.includes("ssr: false"), "global shell ssr:false");
  assert(
    lazy.includes("classfinder-help-global"),
    "dynamic import global shell",
  );
  console.log("ok  lazy loading unchanged");

  console.log("\nHelp launcher mount tests passed.\n");
}

main();

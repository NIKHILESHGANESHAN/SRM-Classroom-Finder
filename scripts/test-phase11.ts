/**
 * Phase 11 smoke tests — env validation, rate limiting, PWA assets.
 * Run: npx tsx scripts/test-phase11.ts
 *
 * HTTP checks expect `npm run dev` on :3000 (or TEST_BASE_URL).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  RATE_LIMITS,
  rateLimit,
  resetRateLimits,
} from "../lib/rate-limit";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function fetchStatus(pathname: string): Promise<number> {
  const res = await fetch(`${BASE}${pathname}`, {
    redirect: "manual",
  });
  return res.status;
}

async function main() {
  section("PWA assets on disk");
  for (const rel of [
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/icon-maskable-512.png",
    "public/icons/apple-touch-icon.png",
    "public/sw.js",
    "app/manifest.ts",
    "app/error.tsx",
    "app/global-error.tsx",
    "app/loading.tsx",
    "app/not-found.tsx",
    "app/stats/error.tsx",
    "lib/env.ts",
    "lib/logger.ts",
    "lib/rate-limit.ts",
    "middleware.ts",
  ]) {
    assert(existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    console.log(`ok  ${rel}`);
  }

  section("Env validation (Zod) — missing DATABASE_URL fails clearly");
  const envFail = spawnSync(
    "npx",
    [
      "tsx",
      "-e",
      `
      (async () => {
        process.env.DATABASE_URL = "";
        process.env.CRON_SECRET = "long-enough-secret";
        try {
          await import("./lib/env.ts");
          console.log("UNEXPECTED_OK");
          process.exit(1);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("DATABASE_URL") && !msg.includes("Invalid environment")) {
            console.error(msg);
            process.exit(2);
          }
          console.log("ENV_FAIL_OK");
          console.log(msg.split("\\n").slice(0, 5).join(" | "));
        }
      })();
      `,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        CRON_SECRET: "long-enough-secret",
      },
    },
  );

  assert(
    envFail.status === 0 && envFail.stdout.includes("ENV_FAIL_OK"),
    `env validation did not fail clearly:\n${envFail.stdout}\n${envFail.stderr}`,
  );
  console.log("ok  missing DATABASE_URL throws readable error");

  section("Rate limiter unit");
  resetRateLimits();
  const key = `test:${Date.now()}`;
  for (let i = 0; i < RATE_LIMITS.api.limit; i++) {
    const r = rateLimit(key, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowMs);
    assert(r.success, `expected success on request ${i + 1}`);
  }
  const blocked = rateLimit(key, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowMs);
  assert(!blocked.success, "expected rate limit block after window full");
  console.log(
    `ok  blocked after ${RATE_LIMITS.api.limit} requests (remaining=${blocked.remaining})`,
  );
  resetRateLimits();

  section("HTTP — pages, 404, PWA, cron (requires dev server)");
  let serverUp = false;
  try {
    const home = await fetchStatus("/");
    serverUp = home === 200;
  } catch {
    console.log("skip HTTP checks — start `npm run dev` and re-run");
  }

  if (serverUp) {
    for (const [pathName, expect] of [
      ["/", 200],
      ["/finder", 200],
      ["/contribute", 200],
      ["/stats", 200],
      ["/this-route-does-not-exist-phase11", 404],
      ["/manifest.webmanifest", 200],
      ["/sw.js", 200],
      ["/icons/icon-192.png", 200],
      ["/icons/icon-512.png", 200],
    ] as const) {
      const status = await fetchStatus(pathName);
      assert(
        status === expect,
        `${pathName} expected ${expect}, got ${status}`,
      );
      console.log(`ok  ${pathName} → ${status}`);
    }

    const manifestRes = await fetch(`${BASE}/manifest.webmanifest`);
    const manifest = (await manifestRes.json()) as {
      name?: string;
      display?: string;
      icons?: unknown[];
    };
    assert(
      Boolean(manifest.name?.includes("Classroom Finder")),
      "manifest name missing",
    );
    assert(manifest.display === "standalone", "manifest display standalone");
    assert(
      Array.isArray(manifest.icons) && manifest.icons.length >= 2,
      "manifest icons missing",
    );
    console.log("ok  manifest JSON installable fields");

    const homeHtml = await (await fetch(`${BASE}/`)).text();
    assert(
      homeHtml.includes('rel="manifest"') ||
        homeHtml.includes("manifest.webmanifest"),
      "HTML missing manifest link",
    );
    assert(
      homeHtml.includes("og:title") || homeHtml.includes("property=\"og:"),
      "HTML missing Open Graph tags",
    );
    console.log("ok  SEO / Open Graph tags present in HTML");

    const cronSecret = process.env.CRON_SECRET;
    assert(cronSecret, "CRON_SECRET must be set for cron check");
    const cronOk = await fetch(`${BASE}/api/cron/expire`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert(cronOk.status === 200, `cron expected 200, got ${cronOk.status}`);
    console.log("ok  cron authorized → 200");

    const cronUnauthorized = await fetch(`${BASE}/api/cron/expire`);
    assert(
      cronUnauthorized.status === 401 || cronUnauthorized.status === 429,
      `cron unauthorized expected 401/429, got ${cronUnauthorized.status}`,
    );
    console.log(`ok  cron unauthorized → ${cronUnauthorized.status}`);

    let saw429 = false;
    for (let i = 0; i < 90; i++) {
      const res = await fetch(`${BASE}/api/cron/expire`);
      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }
    assert(saw429, "expected HTTP 429 from API rate limiting under burst");
    console.log("ok  API rate limit returns 429 under burst");
  }

  console.log("\nPhase 11 checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

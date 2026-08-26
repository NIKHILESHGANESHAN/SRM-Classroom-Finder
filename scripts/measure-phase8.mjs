/**
 * Phase 8 / V3 final performance baseline — TTFB + transfer sizes (local production server).
 * Run: node scripts/measure-phase8.mjs [baseUrl]
 * Requires: production server (`npm run build && npm run start`)
 */

const BASE = process.argv[2] ?? "http://localhost:3001";

const ROUTES = [
  "/",
  "/finder",
  "/contribute",
  "/stats",
  "/contact",
  "/contact/chat",
  "/contact/community",
  "/how-it-works",
];

async function measureRoute(path) {
  const url = `${BASE}${path}`;
  const started = performance.now();
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
    redirect: "follow",
  });
  const ttfbMs = performance.now() - started;
  const body = await response.text();
  const totalBytes = new TextEncoder().encode(body).length;
  const cacheControl = response.headers.get("cache-control") ?? "none";
  return {
    path,
    status: response.status,
    ttfbMs: Math.round(ttfbMs),
    htmlBytes: totalBytes,
    cacheControl,
  };
}

async function measureApi(path, samples = 5) {
  const durations = [];
  let last = { status: 0, bytes: 0 };
  for (let i = 0; i < samples; i += 1) {
    const url = `${BASE}${path}`;
    const started = performance.now();
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    durations.push(Math.round(performance.now() - started));
    const body = await response.text();
    last = {
      status: response.status,
      bytes: new TextEncoder().encode(body).length,
    };
  }
  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const min = durations[0];
  const max = durations[durations.length - 1];
  return {
    path,
    status: last.status,
    durationMs: median,
    minMs: min,
    maxMs: max,
    bytes: last.bytes,
    samples,
  };
}

async function main() {
  console.log(`Performance measurements @ ${BASE}\n`);

  // Warm up the serverless/DB connection pool before timed routes.
  try {
    await fetch(`${BASE}/`, { headers: { Accept: "text/html" } });
    await fetch(`${BASE}/api/finder`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    /* warmup best-effort */
  }

  console.log("=== HTML routes (TTFB + HTML bytes) ===");
  for (const route of ROUTES) {
    try {
      const r = await measureRoute(route);
      console.log(
        `${r.path.padEnd(22)} status=${r.status} ttfb=${r.ttfbMs}ms html=${r.htmlBytes}B cache=${r.cacheControl}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${route.padEnd(22)} ERROR: ${message}`);
    }
  }

  console.log("\n=== Finder poll API (median of 5) ===");
  try {
    const api = await measureApi("/api/finder", 5);
    console.log(
      `${api.path.padEnd(22)} status=${api.status} median=${api.durationMs}ms min=${api.minMs}ms max=${api.maxMs}ms bytes=${api.bytes}B`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`/api/finder           ERROR: ${message}`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Basic in-memory fixed-window rate limiter (Phase 11).
 *
 * Suitable for coursework / single-region Node runtimes. On Vercel each
 * isolate has its own Map — still blocks burst abuse per instance, which is
 * enough alongside DB unique constraints and daily contribution caps.
 *
 * Not a substitute for Redis/Upstash at multi-region scale.
 */

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the current window resets */
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Periodically prune expired buckets to avoid unbounded Map growth. */
const MAX_BUCKETS = 5_000;

function pruneIfNeeded(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still over capacity — drop oldest half by reset time
  if (buckets.size >= MAX_BUCKETS) {
    const entries = Array.from(buckets.entries()).sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (let i = 0; i < Math.ceil(entries.length / 2); i++) {
      buckets.delete(entries[i]![0]);
    }
  }
}

/**
 * Consume one request from the fixed window for `key`.
 *
 * @param key    Stable identifier (IP, device token, route+IP, …)
 * @param limit  Max requests allowed per window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneIfNeeded(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Clear all buckets — used by tests. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Client IP from standard proxy headers (Vercel / reverse proxies). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Shared presets used by API routes and Server Actions. */
export const RATE_LIMITS = {
  /** Cron endpoint — protect against brute-force of the bearer secret */
  cron: { limit: 30, windowMs: 60_000 },
  /** Contribute Server Action — burst cap (daily DB cap still applies) */
  contribute: { limit: 20, windowMs: 60_000 },
  /** Occupied-report Server Action */
  report: { limit: 30, windowMs: 60_000 },
  /** Still Free confirmations — burst cap; uniqueness is enforced in DB */
  stillFree: { limit: 20, windowMs: 60_000 },
  /** Generic /api/* fallback (middleware) */
  api: { limit: 60, windowMs: 60_000 },
} as const;

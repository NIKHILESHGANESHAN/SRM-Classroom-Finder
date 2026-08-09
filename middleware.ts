import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  RATE_LIMITS,
  getClientIp,
  rateLimit,
} from "@/lib/rate-limit";

/**
 * Edge middleware — basic rate limiting for `/api/*` (Phase 11).
 * Returns 429 with Retry-After when the fixed window is exhausted.
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const key = `api:${ip}:${request.nextUrl.pathname}`;
  const { limit, windowMs } = RATE_LIMITS.api;
  const result = rateLimit(key, limit, windowMs);

  if (!result.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Please try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000)),
  );
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

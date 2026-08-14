import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  RATE_LIMITS,
  getClientIp,
  rateLimit,
} from "@/lib/rate-limit";
import {
  ADMIN_COOKIE,
  isAdminProtectedPath,
  verifyAdminSessionEdge,
} from "@/lib/admin/edge-session";

/**
 * Edge middleware — API rate limits (Phase 11) + admin cookie gate (V2.6).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isAdminProtectedPath(pathname)) {
    const secret = process.env.ADMIN_SECRET ?? "";
    const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
    const ok = await verifyAdminSessionEdge(cookie, secret);
    if (!ok) {
      const login = new URL("/admin/login", request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const key = `api:${ip}:${pathname}`;
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
  matcher: ["/api/:path*", "/admin", "/admin/:path*"],
};

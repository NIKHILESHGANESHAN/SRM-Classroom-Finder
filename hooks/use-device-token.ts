"use client";

import { useEffect, useState } from "react";
import { ensureDeviceToken, peekDeviceToken } from "@/lib/token";

/**
 * Returns the anonymous device token, creating + syncing it on first mount.
 * Token is null only for the first paint before useEffect runs (SSR / hydration).
 */
export function useDeviceToken(): string | null {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : peekDeviceToken(),
  );

  useEffect(() => {
    setToken(ensureDeviceToken());
  }, []);

  return token;
}

"use client";

import { useEffect } from "react";
import { ensureDeviceToken } from "@/lib/token";

/**
 * Runs once per app mount to mint / sync the anonymous device token into
 * cookie + localStorage. Renders nothing — drop into the root Providers tree
 * so every route gets a token before Contribute / Report submissions.
 */
export function DeviceTokenBootstrap() {
  useEffect(() => {
    ensureDeviceToken();
  }, []);

  return null;
}

"use client";

import { ThemeProvider } from "next-themes";
import { AppToaster } from "@/components/app-toaster";
import { DeviceTokenBootstrap } from "@/components/device-token-bootstrap";
import { PageTransition } from "@/components/page-transition";

/**
 * Client-side providers for theme (next-themes), toasts (sonner), anonymous
 * device-token bootstrap, and route cross-fades (Phase 12).
 * Kept in a single boundary so the root layout can stay a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DeviceTokenBootstrap />
      <PageTransition>{children}</PageTransition>
      <AppToaster />
    </ThemeProvider>
  );
}

"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { DeviceTokenBootstrap } from "@/components/device-token-bootstrap";

/**
 * Client-side providers for theme (next-themes), toasts (sonner), and the
 * anonymous device-token bootstrap (cookie + localStorage sync).
 * Kept in a single boundary so the root layout can stay a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DeviceTokenBootstrap />
      {children}
      <Toaster
        position="top-right"
        duration={3500}
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
    </ThemeProvider>
  );
}

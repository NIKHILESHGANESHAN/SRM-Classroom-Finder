"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

/**
 * Client-side providers for theme (next-themes) and toasts (sonner).
 * Kept in a single boundary so the root layout can stay a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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

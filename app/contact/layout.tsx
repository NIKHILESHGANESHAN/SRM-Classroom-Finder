import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact and help for ${PRODUCT_NAME}.`,
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative min-h-screen px-4 py-4 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

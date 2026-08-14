import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative min-h-screen px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.06),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(38_92%_50%_/_0.1),_transparent_40%)]"
      />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

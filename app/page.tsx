import { LandingCards } from "@/components/landing-cards";
import { MoreOptionsMenu } from "@/components/more-options-menu";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Soft navy → amber atmosphere (not a flat fill) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(38_92%_50%_/_0.12),_transparent_45%)]"
      />

      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
        <MoreOptionsMenu />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            SRM KTR
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            Classroom Finder
          </h1>
          <p className="mx-auto max-w-md text-pretty text-muted-foreground">
            Find an empty room between periods — or help classmates by reporting one.
          </p>
        </header>

        <LandingCards />

        <footer className="text-sm text-muted-foreground">
          Built by NikhileshGaneshan &amp; Sabrina · SRM KTR · DBMS Course Project
        </footer>
      </div>
    </main>
  );
}

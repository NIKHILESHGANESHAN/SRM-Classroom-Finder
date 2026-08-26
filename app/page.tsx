import {
  LandingActions,
  LandingHero,
  LandingNav,
} from "@/components/landing-actions";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,hsl(var(--color-accent)/0.07),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,hsl(var(--color-accent)/0.12),transparent_55%)]"
      />

      <LandingNav />

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col px-4 pb-6 pt-5 sm:min-h-[calc(100dvh-4.5rem)] sm:px-6 sm:pb-8 sm:pt-10 lg:max-w-2xl lg:pt-14">
        <div className="flex flex-1 flex-col justify-center gap-8 sm:gap-10 lg:gap-12">
          <LandingHero />
          <LandingActions />
        </div>
      </main>
    </div>
  );
}

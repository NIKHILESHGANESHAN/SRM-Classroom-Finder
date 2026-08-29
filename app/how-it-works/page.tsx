import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How ClassFinder works — student reports, Still Free confirmations, occupied reports, and automatic expiry at SRM KTR.",
  openGraph: {
    title: `How it works · ${PRODUCT_NAME}`,
    description: PRODUCT_DESCRIPTOR,
  },
};

function FlowSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="relative min-h-screen min-w-0 px-4 pt-4 cf-help-clearance sm:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-2xl sm:gap-8">
        <GlassNavigation
          aria-label="How it works navigation"
          className="flex items-center gap-2 px-2 py-2 sm:px-3"
        >
          <Button
            variant="ghost"
            size="icon"
            className="btn-press min-h-11 min-w-11"
            asChild
          >
            <Link href="/" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">
              {PRODUCT_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground">How it works</p>
          </div>
          <MoreOptionsMenu className="shrink-0" />
        </GlassNavigation>

        <header className="space-y-2 px-1">
          <h1 className="type-title text-foreground">How ClassFinder works</h1>
          <p className="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            ClassFinder shows classroom availability based on student reports
            and confirmations — not sensors or guaranteed occupancy data.
          </p>
        </header>

        <div className="space-y-8 border-b border-border pb-8">
          <FlowSection title="Find a room">
            <p>
              Open ClassFinder, pick a building and floor if you want, and
              browse rooms students have reported free for the current period.
            </p>
            <p>
              Each listing shows when it was last verified and how much time
              remains before the report expires.
            </p>
            <p>
              See a room that someone reported? Confirm it&apos;s still free if
              you check it yourself with Still Free. If it&apos;s occupied, tap
              Report Occupied. Both are anonymous.
            </p>
          </FlowSection>

          <FlowSection title="Report a room">
            <p>Found an empty classroom? Tell other students about it.</p>
            <p>
              Open Report a room, choose the building, floor, classroom, and
              period, then submit. No account needed.
            </p>
          </FlowSection>

          <FlowSection title="Keeping listings honest">
            <p>
              Two independent occupied reports from different devices hide a
              listing. The same device cannot count twice.
            </p>
            <p>
              Reports don&apos;t stay forever. Once their time window ends, they
              disappear from active availability.
            </p>
            <p>
              Finder also refreshes on its own while you have it open, so the
              list stays reasonably current.
            </p>
          </FlowSection>

          <FlowSection title="Anonymous by design">
            <p>
              No account, OTP, or login. ClassFinder uses a local device token
              only to prevent duplicate reports — never a name or email.
            </p>
          </FlowSection>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="btn-press min-h-11" asChild>
            <Link href="/finder">Find a classroom</Link>
          </Button>
          <Button variant="outline" className="btn-press min-h-11" asChild>
            <Link href="/contribute">Report a room</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

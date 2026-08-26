import type { Metadata } from "next";
import { StatsDashboard } from "@/components/stats/stats-dashboard";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { getStatsPageData } from "@/lib/stats-data";

export const metadata: Metadata = {
  title: "Activity",
  description:
    "See how students are using ClassFinder — real classroom reports and activity at SRM KTR.",
  openGraph: {
    title: `Activity · ${PRODUCT_NAME}`,
    description:
      "See how students are using ClassFinder — real classroom reports and activity at SRM KTR.",
  },
};

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const data = await getStatsPageData();

  return (
    <main className="relative min-h-screen px-4 py-4 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10">
        <StatsDashboard data={data} />
      </div>
    </main>
  );
}

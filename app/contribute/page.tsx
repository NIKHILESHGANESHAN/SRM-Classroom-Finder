import type { Metadata } from "next";
import { ContributeAfterHours } from "@/components/contribute/contribute-after-hours";
import { ContributeWizard } from "@/components/contribute/contribute-wizard";
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from "@/lib/design-tokens";
import { getContributePageData } from "@/lib/contribute-data";

export const metadata: Metadata = {
  title: "Report a room",
  description: PRODUCT_DESCRIPTOR,
  openGraph: {
    title: `Report a room · ${PRODUCT_NAME}`,
    description: PRODUCT_DESCRIPTOR,
  },
};

export const dynamic = "force-dynamic";

export default async function ContributePage() {
  const data = await getContributePageData();

  return (
    <main className="relative min-h-screen px-4 py-4 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10">
        {data.afterHours ? (
          <ContributeAfterHours />
        ) : (
          <ContributeWizard data={data} />
        )}
      </div>
    </main>
  );
}

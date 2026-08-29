import type { Metadata } from "next";
import { ContributeGate } from "@/components/contribute/contribute-gate";
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
    <main className="relative min-h-screen min-w-0 px-4 pt-4 cf-help-clearance sm:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10">
        <ContributeGate data={data} />
      </div>
    </main>
  );
}

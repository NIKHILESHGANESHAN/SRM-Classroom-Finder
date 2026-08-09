import type { Metadata } from "next";
import { ContributeWizard } from "@/components/contribute/contribute-wizard";
import { getContributePageData } from "@/lib/contribute-data";

export const metadata: Metadata = {
  title: "Contributor",
  description:
    "Anonymously report a free classroom at SRM KTR (UB, TP1, TP2) for the current period.",
  openGraph: {
    title: "Contributor · SRM KTR Classroom Finder",
    description:
      "Anonymously report a free classroom at SRM KTR (UB, TP1, TP2) for the current period.",
  },
};

export const dynamic = "force-dynamic";

export default async function ContributePage() {
  const data = await getContributePageData();

  return (
    <main className="relative min-h-screen px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.06),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(38_92%_50%_/_0.1),_transparent_40%)]"
      />
      <div className="relative z-10">
        <ContributeWizard data={data} />
      </div>
    </main>
  );
}

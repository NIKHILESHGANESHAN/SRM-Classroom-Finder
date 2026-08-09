import type { Metadata } from "next";
import { FinderBoard } from "@/components/finder/finder-board";
import { getFinderPageData } from "@/lib/finder-data";

export const metadata: Metadata = {
  title: "Class Finder",
  description:
    "See which SRM KTR classrooms are free right now across UB, TP1, and TP2.",
};

export const dynamic = "force-dynamic";

type FinderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<
    string,
    string | string[] | undefined
  >;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function FinderPage({ searchParams }: FinderPageProps) {
  // Next 14 passes a plain object; keep Promise-compatible for forward-compat
  const params = await Promise.resolve(searchParams);

  const data = await getFinderPageData({
    buildingId: first(params.building) ?? null,
    floorId: first(params.floor) ?? null,
    // undefined → default current slot; "all" → no slot filter
    timeSlotId:
      first(params.slot) === undefined ? undefined : first(params.slot) ?? null,
  });

  return (
    <main className="relative min-h-screen px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.06),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_hsl(38_92%_50%_/_0.1),_transparent_40%)]"
      />
      <div className="relative z-10">
        <FinderBoard data={data} />
      </div>
    </main>
  );
}

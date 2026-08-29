import type { Metadata } from "next";
import { FinderBoard } from "@/components/finder/finder-board";
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from "@/lib/design-tokens";
import {
  getFinderPageData,
  resolveFinderDeepLink,
} from "@/lib/finder-data";
import { parseFinderFocus } from "@/lib/finder-realtime";

export const metadata: Metadata = {
  title: "Find a classroom",
  description: PRODUCT_DESCRIPTOR,
  openGraph: {
    title: `Find a classroom · ${PRODUCT_NAME}`,
    description: PRODUCT_DESCRIPTOR,
  },
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
  const params = await Promise.resolve(searchParams);

  const data = await getFinderPageData({
    buildingId: first(params.building) ?? null,
    floorId: first(params.floor) ?? null,
    timeSlotId:
      first(params.slot) === undefined ? undefined : first(params.slot) ?? null,
  });

  const focus = parseFinderFocus(first(params.focus));
  const deepLink = await resolveFinderDeepLink({
    buildings: data.buildings,
    applied: data.applied,
    roomRaw: first(params.room),
  });

  return (
    <main className="relative min-h-screen min-w-0 px-4 pt-4 cf-help-clearance sm:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,hsl(var(--color-accent)/0.06),transparent_55%)]"
      />
      <div className="relative z-10">
        <FinderBoard data={data} focus={focus} deepLink={deepLink} />
      </div>
    </main>
  );
}

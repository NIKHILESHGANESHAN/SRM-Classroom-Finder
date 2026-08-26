"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import type { StatsPageData } from "@/lib/stats-data";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { EASE_OUT_EXPO, MOTION_STANDARD } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Lazy-load Recharts — keeps /stats first-load JS smaller. */
const ReportsBarChart = dynamic(
  () =>
    import("@/components/stats/reports-bar-chart").then(
      (m) => m.ReportsBarChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-52 w-full rounded-surface bg-muted/40 motion-reduce:animate-none sm:h-60"
        aria-hidden
      />
    ),
  },
);

type StatsDashboardProps = {
  data: StatsPageData;
};

function statusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "unverified":
      return "Unverified";
    case "hidden":
      return "Hidden";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function formatCount(value: number, decimals = 0): string {
  return decimals > 0
    ? value.toFixed(decimals)
    : value.toLocaleString("en-IN");
}

function PageSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SolidPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-surface border border-border bg-card px-4 py-4 shadow-token-sm sm:px-5 sm:py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

export function StatsDashboard({ data }: StatsDashboardProps) {
  const weekRangeLabel = `${data.weekStart} → ${data.campusToday}`;
  const buildingChartHasData = data.reportsPerBuilding.some(
    (row) => row.reportCount > 0,
  );

  if (!data.hasAnyData) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-2xl sm:gap-7">
        <StatsNavigation />
        <FadeIn className="space-y-4">
          <header className="space-y-2 px-1">
            <h1 className="type-title text-foreground">ClassFinder activity</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A look at real classroom reports at SRM KTR. Week of{" "}
              {weekRangeLabel}.
            </p>
          </header>
          <SolidPanel className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Not enough activity yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Stats will become more useful as students report and confirm
              classrooms. Nothing is shown until real reports exist.
            </p>
            <Button asChild className="btn-press mt-5 min-h-11">
              <Link href="/contribute">Report a room</Link>
            </Button>
          </SolidPanel>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 sm:max-w-2xl sm:gap-7">
      <StatsNavigation />

      <FadeIn className="space-y-6 sm:space-y-8">
        <header className="space-y-2 px-1">
          <h1 className="type-title text-foreground">ClassFinder activity</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Real classroom reports at SRM KTR. Campus week {weekRangeLabel}.
          </p>
        </header>

        <div className="space-y-4 border-b border-border pb-6 sm:pb-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Reports today</dt>
              <dd className="text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
                {formatCount(data.totals.today)}
              </dd>
              <dd className="text-xs text-muted-foreground">
                Campus date {data.campusToday}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                Reports this week
              </dt>
              <dd className="text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
                {formatCount(data.totals.thisWeek)}
              </dd>
              <dd className="text-xs text-muted-foreground">{weekRangeLabel}</dd>
            </div>
          </dl>

          {(data.busiestBuildingToday || data.mostActiveSlotThisWeek) && (
            <ul className="space-y-2 border-t border-border/70 pt-4 text-sm">
              {data.busiestBuildingToday ? (
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">
                    Busiest building today
                  </span>
                  <span className="font-medium text-foreground">
                    {data.busiestBuildingToday.code}
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                      {formatCount(data.busiestBuildingToday.reportCount)} reports
                    </span>
                  </span>
                </li>
              ) : (
                <li className="text-muted-foreground">
                  No building reports today yet.
                </li>
              )}
              {data.mostActiveSlotThisWeek ? (
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">
                    Busiest slot this week
                  </span>
                  <span className="font-medium text-foreground">
                    Slot {data.mostActiveSlotThisWeek.slotOrder}
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {data.mostActiveSlotThisWeek.rangeLabel}
                    </span>
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                      {formatCount(data.mostActiveSlotThisWeek.reportCount)} reports
                    </span>
                  </span>
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <PageSection
          title="Reports by building"
          description="Free classroom reports submitted this week."
        >
          {buildingChartHasData ? (
            <SolidPanel className="space-y-4">
              <ReportsBarChart data={data.reportsPerBuilding} />
              <BuildingReportsTable data={data.reportsPerBuilding} />
            </SolidPanel>
          ) : (
            <p className="text-sm text-muted-foreground">
              No building reports this week yet.
            </p>
          )}
        </PageSection>

        <PageSection
          title="Report status this week"
          description="How submitted reports are classified."
        >
          {data.statusBreakdownThisWeek.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No status breakdown available yet.
            </p>
          ) : (
            <SolidPanel>
              <ul className="divide-y divide-border/70">
                {data.statusBreakdownThisWeek.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {statusLabel(row.status)}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatCount(row.reportCount)}
                    </span>
                  </li>
                ))}
              </ul>
            </SolidPanel>
          )}
        </PageSection>

        <PageSection
          title="Frequently reported rooms"
          description="Rooms reported more than once this week."
        >
          {data.topClassroomsThisWeek.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No room was reported more than once this week.
            </p>
          ) : (
            <SolidPanel className="overflow-x-auto">
              <table className="w-full min-w-[16rem] text-left text-sm">
                <caption className="sr-only">
                  Rooms reported more than once this week
                </caption>
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Room
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Reports
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topClassroomsThisWeek.map((room) => (
                    <tr
                      key={room.classroomId}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {room.buildingCode} {room.roomNumber}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          Floor {room.floorNumber}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">
                        {formatCount(room.reportCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SolidPanel>
          )}
        </PageSection>

        <PageSection
          title="Student confirmations"
          description="Average confirmations per report this week."
        >
          {data.avgConfirmationsThisWeek !== null ? (
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCount(data.avgConfirmationsThisWeek, 1)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                per report
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough confirmations to calculate an average yet.
            </p>
          )}
        </PageSection>
      </FadeIn>
    </div>
  );
}

function BuildingReportsTable({
  data,
}: {
  data: StatsPageData["reportsPerBuilding"];
}) {
  const sorted = [...data].sort((a, b) => b.reportCount - a.reportCount);

  return (
    <div>
      <h3 className="sr-only">Building report counts this week</h3>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Reports submitted per building this week
        </caption>
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            <th scope="col" className="pb-2 pr-4 font-medium">
              Building
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Reports
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.buildingId}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-2 pr-4">
                <span className="font-medium text-foreground">{row.code}</span>
                <span className="ml-2 text-muted-foreground">{row.name}</span>
              </td>
              <td className="py-2 text-right tabular-nums text-foreground">
                {formatCount(row.reportCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsNavigation() {
  return (
    <GlassNavigation
      aria-label="Stats navigation"
      className="flex items-center gap-2 px-2 py-2 sm:px-3"
    >
      <Button variant="ghost" size="icon" className="btn-press min-h-11 min-w-11" asChild>
        <Link href="/" aria-label="Back to home">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground sm:text-lg">
          {PRODUCT_NAME}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          See how students are using ClassFinder.
        </p>
      </div>
      <MoreOptionsMenu className="shrink-0" />
    </GlassNavigation>
  );
}

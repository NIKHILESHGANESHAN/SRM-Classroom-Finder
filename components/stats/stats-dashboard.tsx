"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BarChart3, Building2, Clock3, DoorOpen } from "lucide-react";
import { CountUp } from "@/components/stats/count-up";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StatsPageData } from "@/lib/stats-data";
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";

/** Lazy-load Recharts — keeps /stats first-load JS smaller without changing UI. */
const ReportsBarChart = dynamic(
  () =>
    import("@/components/stats/reports-bar-chart").then(
      (m) => m.ReportsBarChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 w-full animate-pulse rounded-xl bg-muted/50 sm:h-72"
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

function InViewBlock({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: DURATION_UI,
        delay: reduceMotion ? 0 : delay,
        ease: EASE_OUT_EXPO,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Client Stats shell — count-ups, chart animation, reduced-motion aware entrance.
 */
export function StatsDashboard({ data }: StatsDashboardProps) {
  if (!data.hasAnyData) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <StatsHeader weekStart={data.weekStart} campusToday={data.campusToday} />
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <DoorOpen className="h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-semibold text-primary">
              Not enough activity yet
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Statistics will appear as students begin reporting classrooms.
              Zeroes are not invented — there are no free reports for this campus
              week yet.
            </p>
            <Button asChild className="mt-2 min-h-11">
              <Link href="/contribute">Report a room</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <StatsHeader weekStart={data.weekStart} campusToday={data.campusToday} />

      <div className="grid gap-4 sm:grid-cols-2">
        <InViewBlock>
          <Card className="h-full border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription>Reports today</CardDescription>
              <CardTitle className="text-3xl tabular-nums text-primary sm:text-4xl">
                <CountUp value={data.totals.today} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Campus date {data.campusToday}
            </CardContent>
          </Card>
        </InViewBlock>

        <InViewBlock delay={0.06}>
          <Card className="h-full border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription>Reports this week</CardDescription>
              <CardTitle className="text-3xl tabular-nums text-primary sm:text-4xl">
                <CountUp value={data.totals.thisWeek} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Week of {data.weekStart} → {data.campusToday}
            </CardContent>
          </Card>
        </InViewBlock>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InViewBlock delay={0.04}>
          <Card className="border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader>
              <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" aria-hidden />
              </div>
              <CardTitle className="text-base">Busiest building today</CardTitle>
              <CardDescription>GROUP BY building · COUNT · LIMIT 1</CardDescription>
            </CardHeader>
            <CardContent>
              {data.busiestBuildingToday ? (
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {data.busiestBuildingToday.code}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.busiestBuildingToday.name}
                  </p>
                  <p className="mt-2 text-sm font-medium tabular-nums">
                    <CountUp value={data.busiestBuildingToday.reportCount} /> reports
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reports today yet.</p>
              )}
            </CardContent>
          </Card>
        </InViewBlock>

        <InViewBlock delay={0.08}>
          <Card className="border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader>
              <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <Clock3 className="h-4 w-4" aria-hidden />
              </div>
              <CardTitle className="text-base">Most active slot this week</CardTitle>
              <CardDescription>GROUP BY time_slot · week range</CardDescription>
            </CardHeader>
            <CardContent>
              {data.mostActiveSlotThisWeek ? (
                <div>
                  <p className="text-2xl font-bold text-primary">
                    Slot {data.mostActiveSlotThisWeek.slotOrder}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.mostActiveSlotThisWeek.rangeLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium tabular-nums">
                    <CountUp value={data.mostActiveSlotThisWeek.reportCount} /> reports
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reports this week yet.</p>
              )}
            </CardContent>
          </Card>
        </InViewBlock>
      </div>

      <InViewBlock>
        <Card className="border-border/80 shadow-sm dark:shadow-black/30">
          <CardHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" aria-hidden />
            </div>
            <CardTitle className="text-base">Reports per building</CardTitle>
            <CardDescription>
              LEFT JOIN buildings · GROUP BY · this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsBarChart data={data.reportsPerBuilding} />
          </CardContent>
        </Card>
      </InViewBlock>

      <div className="grid gap-4 sm:grid-cols-2">
        <InViewBlock>
          <Card className="border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="text-base">Avg confirmations</CardTitle>
              <CardDescription>AVG(confirmation_count) this week</CardDescription>
            </CardHeader>
            <CardContent>
              {data.avgConfirmationsThisWeek !== null ? (
                <p className="text-3xl font-bold tabular-nums text-primary">
                  <CountUp
                    value={data.avgConfirmationsThisWeek}
                    decimals={1}
                    durationMs={700}
                  />
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </InViewBlock>

        <InViewBlock delay={0.06}>
          <Card className="border-border/80 shadow-sm dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="text-base">Status mix this week</CardTitle>
              <CardDescription>GROUP BY status · COUNT</CardDescription>
            </CardHeader>
            <CardContent>
              {data.statusBreakdownThisWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                <ul className="space-y-2">
                  {data.statusBreakdownThisWeek.map((row) => (
                    <li
                      key={row.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {statusLabel(row.status)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        <CountUp value={row.reportCount} durationMs={600} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </InViewBlock>
      </div>

      <InViewBlock>
        <Card className="border-border/80 shadow-sm dark:shadow-black/30">
          <CardHeader>
            <CardTitle className="text-base">Top classrooms this week</CardTitle>
            <CardDescription>
              HAVING COUNT(*) ≥ 2 · ORDER BY · LIMIT 5
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topClassroomsThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classroom was reported more than once this week.
              </p>
            ) : (
              <ol className="space-y-3">
                {data.topClassroomsThisWeek.map((room, i) => (
                  <li
                    key={room.classroomId}
                    className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="mr-2 text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-primary">
                        {room.buildingCode} {room.roomNumber}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        Floor {room.floorNumber}
                      </span>
                    </div>
                    <span className="tabular-nums text-sm font-medium">
                      <CountUp value={room.reportCount} durationMs={500} />×
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </InViewBlock>
    </div>
  );
}

function StatsHeader({
  weekStart,
  campusToday,
}: {
  weekStart: string;
  campusToday: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
        <Link href="/" aria-label="Back to home">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate SQL showcase · {weekStart} → {campusToday}
        </p>
      </div>
      <MoreOptionsMenu />
    </div>
  );
}

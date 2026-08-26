"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import type { BuildingReportBar } from "@/lib/stats-data";
import { EASE_OUT_EXPO, MOTION_STANDARD } from "@/lib/motion";

type ReportsBarChartProps = {
  data: BuildingReportBar[];
};

/**
 * Reports-per-building bar chart — real weekly counts only.
 * Textual table lives alongside in the dashboard for accessibility.
 */
export function ReportsBarChart({ data }: ReportsBarChartProps) {
  const reduceMotion = useReducedMotion();
  const chartData = data.map((d) => ({
    code: d.code,
    name: d.name,
    reports: d.reportCount,
  }));

  const hasBars = chartData.some((d) => d.reports > 0);

  if (!hasBars) {
    return null;
  }

  return (
    <motion.div
      className="h-52 w-full min-w-0 overflow-x-auto sm:h-60"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
      role="img"
      aria-label="Bar chart of reports submitted per building this week"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-border"
          />
          <XAxis
            dataKey="code"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            contentStyle={{
              borderRadius: "var(--radius-popover)",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value} reports`, "Count"]}
            labelFormatter={(label, payload) => {
              const name = payload?.[0]?.payload?.name;
              return name ? `${label} · ${name}` : String(label);
            }}
          />
          <Bar
            dataKey="reports"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            isAnimationActive={!reduceMotion}
            animationDuration={250}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

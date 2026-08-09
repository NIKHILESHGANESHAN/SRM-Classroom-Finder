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
import { DURATION_UI, EASE_OUT_EXPO } from "@/lib/motion";

type ReportsBarChartProps = {
  data: BuildingReportBar[];
};

/**
 * Reports-per-building bar chart. Bars grow on scroll-into-view (`whileInView`).
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
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No building reports this week yet.
      </p>
    );
  }

  return (
    <motion.div
      className="h-64 w-full sm:h-72"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: DURATION_UI, ease: EASE_OUT_EXPO }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="code"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            contentStyle={{
              borderRadius: 12,
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
            radius={[8, 8, 0, 0]}
            maxBarSize={64}
            isAnimationActive={!reduceMotion}
            animationDuration={700}
            animationEasing="ease-out"
            animationBegin={reduceMotion ? 0 : 120}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

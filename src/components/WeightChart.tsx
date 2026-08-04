"use client";

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatShortDate } from "@/lib/date";
import type { WeightPoint } from "@/lib/weight";

const TENNESSEE = "#ff8200";
const TENNESSEE_DARK = "#d66d00";

export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-neutral-400">Log a few entries to see your trend here.</p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11 }}
            width={40}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            labelFormatter={(label) => (typeof label === "string" ? formatShortDate(label) : label)}
            formatter={(value, name) => [
              `${Number(value).toFixed(1)} lb`,
              name === "raw" ? "Logged" : "7-day avg",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Scatter dataKey="raw" fill={TENNESSEE} fillOpacity={0.45} />
          <Line
            dataKey="rollingAvg"
            stroke={TENNESSEE_DARK}
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

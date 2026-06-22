// =============================================================================
// WeightChart.tsx — raw weigh-ins (dots) + smoothed trend (line).
//
// Uses Recharts. We convert the stored kilograms into the user's display units
// just for the chart. The raw weigh-ins are drawn as a dots-only line (an
// invisible stroke with visible dots) layered under the trend line.
// =============================================================================
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Units } from "@/lib/db";
import { kgToInputWeight, weightUnitLabel } from "@/lib/units";
import type { WeightSeriesRow } from "@/lib/weight";

export default function WeightChart({
  series,
  units,
}: {
  series: WeightSeriesRow[];
  units: Units;
}) {
  const unit = weightUnitLabel(units);

  // Convert to display units and a short axis label.
  const data = series.map((r) => ({
    label: r.date.slice(5), // "MM-DD"
    raw: round1(kgToInputWeight(r.weightKg, units)),
    trend: round1(kgToInputWeight(r.trendKg, units)),
  }));

  // Pad the y-axis a little above/below the data so points aren't on the edge.
  const values = data.flatMap((d) => [d.raw, d.trend]);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          minTickGap={24}
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          width={44}
        />
        <Tooltip
          formatter={(value, name) => [
            `${value} ${unit}`,
            name === "trend" ? "Trend" : "Weigh-in",
          ]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid rgba(128,128,128,0.2)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        {/* Raw weigh-ins: invisible connecting line, visible dots. */}
        <Line
          type="monotone"
          dataKey="raw"
          stroke="transparent"
          dot={{ r: 3, fill: "var(--muted)" }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        {/* The smoothed trend line. */}
        <Line
          type="monotone"
          dataKey="trend"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// =============================================================================
// IntakeChart.tsx — daily calorie intake as bars, with your target as a line.
// Bars at/under target are calm green; over-target bars are a neutral grey
// (no alarming red — we keep the tone adherence-neutral).
// =============================================================================
"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DailyTotals } from "@/lib/analytics";

export default function IntakeChart({
  series,
  target,
}: {
  series: DailyTotals[];
  target: number;
}) {
  const data = series.map((d) => ({
    label: d.date.slice(5),
    calories: Math.round(d.calories),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={20} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} width={44} />
        <Tooltip
          formatter={(value) => [`${value} kcal`, "Intake"]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid rgba(128,128,128,0.2)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        {target > 0 && (
          <ReferenceLine
            y={target}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            label={{ value: "target", fontSize: 10, fill: "var(--muted)", position: "right" }}
          />
        )}
        <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.calories > target && target > 0 ? "var(--muted)" : "var(--accent)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

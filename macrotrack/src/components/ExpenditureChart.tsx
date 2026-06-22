// =============================================================================
// ExpenditureChart.tsx — your learned daily expenditure (TDEE) over time, one
// point per weekly check-in.
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

export default function ExpenditureChart({
  history,
}: {
  history: { date: string; tdee: number }[];
}) {
  const data = history.map((h) => ({ label: h.date.slice(5), tdee: h.tdee }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={20} />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          width={44}
        />
        <Tooltip
          formatter={(value) => [`${value} kcal/day`, "Expenditure"]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid rgba(128,128,128,0.2)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="tdee"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// Trends page — charts and averages over time:
//   - Estimated expenditure (from check-ins)
//   - Weight trend (raw dots + smoothed line)
//   - Calorie intake vs target
//   - Average daily macros for the selected range
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID } from "@/lib/db";
import { dailyTotals, macroAverage, expenditureHistory } from "@/lib/analytics";
import { getWeightSeries } from "@/lib/weight";
import PageHeader from "@/components/PageHeader";
import WeightChart from "@/components/WeightChart";
import IntakeChart from "@/components/IntakeChart";
import ExpenditureChart from "@/components/ExpenditureChart";

const RANGES = [
  { days: 7, label: "7d" },
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

// A titled white card wrapper used for each chart section.
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4 text-foreground">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export default function TrendsPage() {
  const [days, setDays] = useState(30);

  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  const intake = useLiveQuery(() => dailyTotals(days), [days], []);
  const avg = useLiveQuery(() => macroAverage(days), [days]);
  const expenditure = useLiveQuery(() => expenditureHistory(), [], []);
  const weight = useLiveQuery(() => getWeightSeries(), [], []);

  if (settings === undefined) return null;
  if (!settings) return null;

  const target = settings.currentTargets.calories;

  return (
    <div className="space-y-5">
      <PageHeader title="Trends" subtitle="Your data over time." />

      {/* Range selector (applies to intake + averages) */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/5 dark:bg-white/10 p-1">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              days === r.days ? "bg-card text-accent shadow-sm" : "text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Average daily macros */}
      <Card title={`Average daily intake (last ${days} days)`}>
        {avg && avg.loggedDays > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "kcal", value: avg.avg.calories },
                { label: "Protein", value: `${avg.avg.protein}g` },
                { label: "Carbs", value: `${avg.avg.carbs}g` },
                { label: "Fat", value: `${avg.avg.fat}g` },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-lg font-semibold tabular-nums">{m.value}</div>
                  <div className="text-xs text-muted">{m.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Averaged over {avg.loggedDays} logged day
              {avg.loggedDays === 1 ? "" : "s"}.
            </p>
          </>
        ) : (
          <EmptyNote>No food logged in this range yet.</EmptyNote>
        )}
      </Card>

      {/* Intake vs target */}
      <Card title="Calorie intake vs target">
        {intake.some((d) => d.calories > 0) ? (
          <IntakeChart series={intake} target={target} />
        ) : (
          <EmptyNote>Log some food to see this chart.</EmptyNote>
        )}
      </Card>

      {/* Weight trend */}
      <Card title="Weight trend">
        {weight.length >= 2 ? (
          <WeightChart series={weight} units={settings.units} />
        ) : (
          <EmptyNote>Add at least two weigh-ins to see your trend.</EmptyNote>
        )}
      </Card>

      {/* Estimated expenditure */}
      <Card title="Estimated expenditure">
        {expenditure.length >= 2 ? (
          <ExpenditureChart history={expenditure} />
        ) : (
          <EmptyNote>
            Appears after a couple of weekly check-ins, once the app has learned
            your expenditure.
          </EmptyNote>
        )}
      </Card>
    </div>
  );
}

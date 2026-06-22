// =============================================================================
// Weight page — log your body weight and see the smoothed trend.
//
// One weigh-in per day (saving the same date overwrites it). The chart shows
// raw weigh-ins as dots and the EWMA trend as a line. Tapping a row in the
// history loads it into the form so you can correct it.
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID } from "@/lib/db";
import { todayISO, formatFriendly } from "@/lib/dateUtils";
import {
  getWeightSeries,
  saveWeighIn,
  deleteWeighIn,
} from "@/lib/weight";
import {
  inputWeightToKg,
  kgToInputWeight,
  formatWeight,
  weightUnitLabel,
} from "@/lib/units";
import PageHeader from "@/components/PageHeader";
import WeightChart from "@/components/WeightChart";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function WeightPage() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  const series = useLiveQuery(() => getWeightSeries(), [], []);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (settings === undefined) return null;
  if (!settings) return null; // gate redirects to onboarding

  const units = settings.units;
  const unitLabel = weightUnitLabel(units);

  // Newest weigh-in and its trend, for the headline.
  const latest = series.length > 0 ? series[series.length - 1] : undefined;
  // Does the currently-selected date already have an entry? (Saving overwrites.)
  const existingForDate = series.find((r) => r.date === date);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(weight);
    if (!value) return setError("Enter a weight.");
    const kg = inputWeightToKg(value, units);
    if (kg < 30 || kg > 400) return setError("Enter a realistic weight.");
    try {
      setBusy(true);
      await saveWeighIn(date, kg);
      setWeight("");
      setDate(todayISO());
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Load a history row into the form for editing (a click, not an effect).
  function editRow(rowDate: string, rowWeightKg: number) {
    setDate(rowDate);
    setWeight(String(round1(kgToInputWeight(rowWeightKg, units))));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <PageHeader title="Weight" subtitle="Log weigh-ins and watch your trend." />

      {/* Headline: latest trend weight */}
      <div className="mb-5 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
        {latest ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted">Trend weight</div>
              <div className="text-3xl font-semibold tabular-nums">
                {formatWeight(latest.trendKg, units)}
              </div>
            </div>
            <div className="text-right text-sm text-muted">
              <div>Last weigh-in</div>
              <div className="tabular-nums">
                {formatWeight(latest.weightKg, units)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No weigh-ins yet. Add your first below — the trend line appears once
            you have a couple of entries.
          </p>
        )}
      </div>

      {/* Log form */}
      <form
        onSubmit={handleSave}
        className="mb-6 space-y-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Weight ({unitLabel})</span>
            <input
              className={inputClass}
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Date</span>
            <input
              type="date"
              className={inputClass}
              value={date}
              max={todayISO()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
        </div>
        {existingForDate && (
          <p className="text-xs text-muted">
            This date already has an entry ({formatWeight(
              existingForDate.weightKg,
              units
            )}) — saving will update it.
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {existingForDate ? "Update weigh-in" : "Save weigh-in"}
        </button>
      </form>

      {/* Chart (needs at least 2 points to be meaningful) */}
      {series.length >= 2 ? (
        <div className="mb-6 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-3 text-foreground">
          <WeightChart series={series} units={units} />
        </div>
      ) : (
        series.length === 1 && (
          <p className="mb-6 rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center text-sm text-muted">
            Add one more weigh-in to see your trend chart.
          </p>
        )
      )}

      {/* History (newest first) */}
      {series.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">History</h2>
          <ul className="space-y-2">
            {[...series].reverse().map((r) => (
              <li
                key={r.date}
                className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-3"
              >
                <button
                  onClick={() => editRow(r.date, r.weightKg)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="font-medium">{formatFriendly(r.date)}</div>
                  <div className="text-xs text-muted">
                    Trend {formatWeight(r.trendKg, units)}
                  </div>
                </button>
                <div className="text-right text-sm font-semibold tabular-nums">
                  {formatWeight(r.weightKg, units)}
                </div>
                <button
                  onClick={() => deleteWeighIn(r.date)}
                  aria-label="Delete weigh-in"
                  className="rounded-lg px-2 py-1 text-muted hover:bg-black/5 dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

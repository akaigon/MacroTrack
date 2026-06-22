// =============================================================================
// /checkin — the weekly check-in.
//
// Shows your updated estimated expenditure and proposes new targets for the
// week (old vs proposed, side by side). You can accept, tweak the calorie
// number (macros recompute live), or keep your current targets. While the app
// is still "holding" (not enough data), it explains why and changes nothing.
// =============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID, type Macros } from "@/lib/db";
import { todayISO, formatFriendly } from "@/lib/dateUtils";
import { computeTargets, macrosForCalories } from "@/lib/nutrition";
import {
  estimateExpenditure,
  interpolatedTrend,
  recordCheckIn,
} from "@/lib/expenditure";
import PageHeader from "@/components/PageHeader";

export default function CheckInPage() {
  const router = useRouter();
  const [editCals, setEditCals] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load everything the screen needs in one reactive query.
  const data = useLiveQuery(async () => {
    const settings = await db.settings.get(SETTINGS_ID);
    if (!settings) return null;

    const estimate = await estimateExpenditure();
    const trendW = await interpolatedTrend(todayISO());
    const lastWeigh = await db.weighIns.orderBy("date").last();
    const weightKg = trendW ?? lastWeigh?.weightKg ?? 75;

    // The proposed targets use the LEARNED expenditure (tdeeOverride).
    let proposed: Macros | null = null;
    if (estimate && estimate.state === "updating") {
      proposed = computeTargets({
        sex: settings.sex,
        weightKg,
        heightCm: settings.heightCm,
        age: settings.age,
        activityLevel: settings.activityLevel,
        goal: settings.goal,
        ratePerWeek: settings.ratePerWeek,
        proteinRule: settings.proteinRule,
        fatRule: settings.fatRule,
        tdeeOverride: estimate.estimatedTdee,
      }).targets;
    }

    const checkIns = await db.checkIns
      .orderBy("date")
      .reverse()
      .limit(6)
      .toArray();

    return { settings, estimate, weightKg, proposed, checkIns };
  });

  if (data === undefined) return null; // loading
  if (data === null) return null; // gate redirects to onboarding

  const { settings, estimate, weightKg, proposed, checkIns } = data;
  const current = settings.currentTargets;

  // ---- Acknowledge a "holding" check-in (resets the 7-day timer) ----
  async function acceptHolding() {
    if (!estimate) return;
    setBusy(true);
    await recordCheckIn({
      estimatedTdee: estimate.estimatedTdee,
      state: "holding",
      proposedTargets: current,
      acceptedTargets: current,
    });
    router.push("/");
  }

  // ---- Accept (or tweak) proposed targets ----
  async function acceptUpdating(accepted: Macros) {
    if (!estimate) return;
    setBusy(true);
    await recordCheckIn({
      estimatedTdee: estimate.estimatedTdee,
      state: "updating",
      proposedTargets: proposed!,
      acceptedTargets: accepted,
    });
    router.push("/");
  }

  return (
    <div>
      <PageHeader
        title="Weekly check-in"
        subtitle={formatFriendly(todayISO())}
      />

      {/* ---------- HOLDING ---------- */}
      {(!estimate || estimate.state === "holding") && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-5">
            <div className="text-xs text-muted">Estimated expenditure</div>
            <div className="text-3xl font-semibold tabular-nums">
              ~{estimate?.estimatedTdee ?? "—"}
              <span className="ml-1 text-base font-normal text-muted">
                kcal/day
              </span>
            </div>
            <span className="mt-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              Still calibrating
            </span>
            <p className="mt-3 text-sm text-muted">
              {estimate?.reason ??
                "Keep logging your food and weight and your personalised estimate will appear here."}
            </p>
          </div>

          <p className="text-sm text-muted">
            Your targets are unchanged for now. We&apos;ll propose updates once
            there&apos;s enough data to be confident.
          </p>

          <button
            onClick={acceptHolding}
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            Got it
          </button>
        </div>
      )}

      {/* ---------- UPDATING ---------- */}
      {estimate && estimate.state === "updating" && proposed && (
        <UpdatingView
          estimate={estimate}
          current={current}
          proposed={proposed}
          weightKg={weightKg}
          proteinRule={settings.proteinRule}
          fatRule={settings.fatRule}
          editCals={editCals}
          setEditCals={setEditCals}
          busy={busy}
          onAccept={acceptUpdating}
        />
      )}

      {/* ---------- HISTORY ---------- */}
      {checkIns.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Past check-ins</h2>
          <ul className="space-y-2">
            {checkIns.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-card p-3 text-sm"
              >
                <span>{formatFriendly(c.date)}</span>
                <span className="text-muted tabular-nums">
                  TDEE ~{Math.round(c.estimatedTdee)} · target{" "}
                  {c.acceptedTargets.calories} kcal
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// The "updating" UI is broken out for readability.
function UpdatingView({
  estimate,
  current,
  proposed,
  weightKg,
  proteinRule,
  fatRule,
  editCals,
  setEditCals,
  busy,
  onAccept,
}: {
  estimate: NonNullable<Awaited<ReturnType<typeof estimateExpenditure>>>;
  current: Macros;
  proposed: Macros;
  weightKg: number;
  proteinRule: import("@/lib/db").MacroRule;
  fatRule: import("@/lib/db").MacroRule;
  editCals: string | null;
  setEditCals: (v: string) => void;
  busy: boolean;
  onAccept: (accepted: Macros) => void;
}) {
  // The calorie value being shown (defaults to the proposed number until the
  // user types something). Macros recompute live from it.
  const calsStr = editCals ?? String(proposed.calories);
  const cals = parseFloat(calsStr) || 0;
  const shown = macrosForCalories(cals, weightKg, proteinRule, fatRule).targets;
  const edited = cals !== proposed.calories;

  return (
    <div className="space-y-5">
      {/* Estimate card */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-5">
        <div className="text-xs text-muted">Estimated expenditure</div>
        <div className="text-3xl font-semibold tabular-nums">
          {estimate.estimatedTdee}
          <span className="ml-1 text-base font-normal text-muted">
            kcal/day
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Based on {estimate.loggedDays} logged days; your trend weight moved{" "}
          {estimate.trendChangeKg! > 0 ? "+" : ""}
          {estimate.trendChangeKg} kg while averaging {estimate.avgIntake}{" "}
          kcal/day.
        </p>
      </div>

      {/* Old vs proposed */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Proposed targets</h2>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div />
          <div className="font-medium text-muted">Now</div>
          <div className="font-medium text-accent">New</div>

          <Row label="Calories" now={current.calories} next={shown.calories} />
          <Row label="Protein" now={current.protein} next={shown.protein} unit="g" />
          <Row label="Carbs" now={current.carbs} next={shown.carbs} unit="g" />
          <Row label="Fat" now={current.fat} next={shown.fat} unit="g" />
        </div>
      </div>

      {/* Tweak calories */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
        <label className="mb-2 block text-sm font-medium">
          Adjust calorie target
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditCals(String(cals - 50))}
            className="h-11 w-11 shrink-0 rounded-xl border border-black/10 dark:border-white/15 text-lg"
          >
            −
          </button>
          <input
            className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-center text-base tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            inputMode="numeric"
            value={calsStr}
            onChange={(e) => setEditCals(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setEditCals(String(cals + 50))}
            className="h-11 w-11 shrink-0 rounded-xl border border-black/10 dark:border-white/15 text-lg"
          >
            +
          </button>
        </div>
        {edited && (
          <p className="mt-2 text-xs text-muted">
            Protein and fat stay fixed by your rules; carbs absorb the change.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => onAccept(shown)}
          disabled={busy}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {edited ? "Accept adjusted targets" : "Accept new targets"}
        </button>
        <button
          onClick={() => onAccept(current)}
          disabled={busy}
          className="w-full rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium"
        >
          Keep my current targets
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  now,
  next,
  unit,
}: {
  label: string;
  now: number;
  next: number;
  unit?: string;
}) {
  return (
    <>
      <div className="py-1.5 text-left font-medium">{label}</div>
      <div className="py-1.5 tabular-nums text-muted">
        {now}
        {unit}
      </div>
      <div className="rounded-lg bg-accent/10 py-1.5 font-semibold tabular-nums text-accent">
        {next}
        {unit}
      </div>
    </>
  );
}

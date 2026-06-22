// =============================================================================
// Today page (home, "/").
//
// Shows the selected day's targets, running totals, and remaining amounts as a
// calorie ring + macro bars, plus the food log for that day. You can move
// between days and add/delete entries. Data updates live via useLiveQuery, so
// adding a food instantly refreshes the totals.
// =============================================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID } from "@/lib/db";
import { addDays, formatFriendly, todayISO } from "@/lib/dateUtils";
import { sumMacros } from "@/lib/nutrition";
import { estimateExpenditure, isCheckInDue } from "@/lib/expenditure";
import {
  resolveTargets,
  setDayOverride,
  clearDayOverride,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/targets";
import CalorieRing from "@/components/CalorieRing";
import MacroBar from "@/components/MacroBar";
import ManualFoodForm from "@/components/ManualFoodForm";
import MacroTargetEditor from "@/components/MacroTargetEditor";

export default function TodayPage() {
  // Which day we're looking at (defaults to today).
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);

  // Live data: the settings row and the log entries for the selected day.
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  const entries = useLiveQuery(
    () => db.logEntries.where("date").equals(date).sortBy("createdAt"),
    [date] // re-run whenever the selected date changes
  );
  // Any per-date target override for the selected day.
  const dayOverride = useLiveQuery(() => db.dayTargets.get(date), [date]);
  // The adaptive expenditure estimate and whether a weekly check-in is due.
  const estimate = useLiveQuery(() => estimateExpenditure());
  const checkInDue = useLiveQuery(() => isCheckInDue());

  // While the first read is loading, or before onboarding (the gate will
  // redirect), show nothing to avoid a flash of empty UI.
  if (settings === undefined) return null;
  if (!settings?.onboarded) return null;

  // Resolve which targets apply to this day: override → weekday → default.
  const resolved = resolveTargets(date, settings, dayOverride?.targets);
  const targets = resolved.targets;
  const totals = sumMacros((entries ?? []).map((e) => e.computed));
  const isToday = date === todayISO();

  // A short label explaining where this day's targets come from.
  const sourceLabel =
    resolved.source === "override"
      ? "Custom for this day"
      : resolved.source === "weekday"
      ? `${WEEKDAY_LABELS[weekdayOf(date)]} schedule`
      : "Default targets";

  return (
    <div className="space-y-6">
      {/* ---- Weekly check-in banner (only when due) ---- */}
      {checkInDue && (
        <Link
          href="/checkin"
          className="flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-white"
        >
          <span className="font-medium">Your weekly check-in is ready</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {/* ---- Date navigation ---- */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          aria-label="Previous day"
          className="rounded-lg px-3 py-2 text-lg text-muted hover:bg-black/5 dark:hover:bg-white/10"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-semibold">
            {isToday ? "Today" : formatFriendly(date)}
          </div>
          {/* A hidden-styled native date input lets you jump to any date. */}
          <label className="text-xs text-accent">
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-transparent text-center text-xs text-accent outline-none"
            />
          </label>
        </div>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          aria-label="Next day"
          disabled={isToday}
          className="rounded-lg px-3 py-2 text-lg text-muted hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* ---- Calorie ring ---- */}
      <CalorieRing consumed={totals.calories} target={targets.calories} />

      {/* ---- Adaptive expenditure estimate (calm, informational) ---- */}
      {estimate && (
        <p className="text-center text-xs text-muted">
          {estimate.state === "updating"
            ? `Estimated expenditure ~${estimate.estimatedTdee} kcal/day`
            : `Estimated expenditure ~${estimate.estimatedTdee} kcal/day · still calibrating`}
        </p>
      )}

      {/* ---- Macro bars ---- */}
      <div className="space-y-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
        {/* Where this day's targets come from + edit-for-this-day control. */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{sourceLabel}</span>
          {!editingTargets && (
            <button
              onClick={() => setEditingTargets(true)}
              className="text-xs font-medium text-accent"
            >
              Adjust this day
            </button>
          )}
        </div>

        {editingTargets ? (
          <MacroTargetEditor
            initial={targets}
            saveLabel="Set for this day"
            onCancel={() => setEditingTargets(false)}
            onReset={
              resolved.source === "override"
                ? async () => {
                    await clearDayOverride(date);
                    setEditingTargets(false);
                  }
                : undefined
            }
            resetLabel="Remove override"
            onSave={async (t) => {
              await setDayOverride(date, t);
              setEditingTargets(false);
            }}
          />
        ) : (
          <>
            <MacroBar
              label="Protein"
              consumed={totals.protein}
              target={targets.protein}
              colorClass="bg-sky-500"
            />
            <MacroBar
              label="Carbs"
              consumed={totals.carbs}
              target={targets.carbs}
              colorClass="bg-amber-500"
            />
            <MacroBar
              label="Fat"
              consumed={totals.fat}
              target={targets.fat}
              colorClass="bg-rose-500"
            />
          </>
        )}
      </div>

      {/* ---- Food log ---- */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Food log</h2>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Add food
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-3">
            <ManualFoodForm date={date} onDone={() => setAdding(false)} />
          </div>
        )}

        {entries && entries.length > 0 ? (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{entry.name}</div>
                  <div className="text-xs text-muted">
                    {entry.servingLabel ? `${entry.servingLabel} · ` : ""}
                    {entry.servings !== 1 ? `×${entry.servings} · ` : ""}
                    {Math.round(entry.computed.protein)}P ·{" "}
                    {Math.round(entry.computed.carbs)}C ·{" "}
                    {Math.round(entry.computed.fat)}F
                  </div>
                </div>
                <div className="text-right text-sm font-semibold tabular-nums">
                  {Math.round(entry.computed.calories)}
                  <span className="ml-0.5 text-xs font-normal text-muted">
                    kcal
                  </span>
                </div>
                <button
                  onClick={() => entry.id && db.logEntries.delete(entry.id)}
                  aria-label={`Delete ${entry.name}`}
                  className="rounded-lg px-2 py-1 text-muted hover:bg-black/5 dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !adding && (
            <p className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center text-sm text-muted">
              Nothing logged yet. Tap “+ Add food” to start.
            </p>
          )
        )}
      </section>
    </div>
  );
}

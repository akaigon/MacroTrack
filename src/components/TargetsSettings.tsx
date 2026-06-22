// =============================================================================
// TargetsSettings.tsx — edit your macro targets in Settings.
//
//  • Default daily targets — the baseline used when nothing else applies.
//  • Macro cycling — optionally give each weekday its own targets (repeats
//    every week). Per-DATE one-offs are set from the Today screen instead.
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID, type Macros } from "@/lib/db";
import {
  WEEKDAY_LABELS,
  setDefaultTargets,
  setWeeklyEnabled,
  setWeekdayTargets,
} from "@/lib/targets";
import MacroTargetEditor from "./MacroTargetEditor";

// Show Monday first (nicer for most people) while keeping JS weekday indexes.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function MacroSummary({ m }: { m: Macros }) {
  return (
    <span className="text-sm text-muted tabular-nums">
      {m.calories} kcal · {m.protein}P · {m.carbs}C · {m.fat}F
    </span>
  );
}

export default function TargetsSettings() {
  const settings = useLiveQuery(
    async () => (await db.settings.get(SETTINGS_ID)) ?? null
  );
  // Which editor is open: "default", a weekday index (number), or null.
  const [editing, setEditing] = useState<"default" | number | null>(null);

  if (!settings) return null;

  const def = settings.currentTargets;
  const week = settings.weeklyTargets;

  return (
    <div className="space-y-6">
      {/* ---- Default targets ---- */}
      <section>
        <h2 className="mb-2 text-sm font-medium">Default daily targets</h2>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
          {editing === "default" ? (
            <MacroTargetEditor
              initial={def}
              saveLabel="Save targets"
              onCancel={() => setEditing(null)}
              onSave={async (t) => {
                await setDefaultTargets(t);
                setEditing(null);
              }}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <MacroSummary m={def} />
              <button
                onClick={() => setEditing("default")}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
              >
                Edit
              </button>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Set protein, carbs, and fat directly — calories are calculated from
            them.
          </p>
        </div>
      </section>

      {/* ---- Weekly schedule (macro cycling) ---- */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Different macros per weekday</h2>
          {/* Simple toggle */}
          <button
            role="switch"
            aria-checked={!!settings.weeklyEnabled}
            onClick={() => setWeeklyEnabled(!settings.weeklyEnabled, def)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.weeklyEnabled ? "bg-accent" : "bg-black/15 dark:bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                settings.weeklyEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {settings.weeklyEnabled ? (
          <ul className="space-y-2">
            {WEEK_ORDER.map((wd) => {
              const t = week?.[wd] ?? def;
              return (
                <li
                  key={wd}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4"
                >
                  {editing === wd ? (
                    <>
                      <p className="mb-2 font-medium">{WEEKDAY_LABELS[wd]}</p>
                      <MacroTargetEditor
                        initial={t}
                        saveLabel="Save"
                        onCancel={() => setEditing(null)}
                        onSave={async (next) => {
                          await setWeekdayTargets(wd, next);
                          setEditing(null);
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{WEEKDAY_LABELS[wd]}</div>
                        <MacroSummary m={t} />
                      </div>
                      <button
                        onClick={() => setEditing(wd)}
                        className="shrink-0 rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-4 text-center text-sm text-muted">
            Off — every day uses your default targets. Turn this on to set
            different macros for, say, training vs rest days.
          </p>
        )}
      </section>
    </div>
  );
}

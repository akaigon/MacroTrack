// =============================================================================
// MacroTargetEditor.tsx — edit a set of macro targets directly.
//
// You type protein / carbs / fat in grams; calories are calculated live
// (4 kcal/g protein & carbs, 9 kcal/g fat). Reused for the default targets,
// each weekday in the weekly schedule, and per-date overrides.
// =============================================================================
"use client";

import { useState } from "react";
import type { Macros } from "@/lib/db";
import { caloriesFromMacros } from "@/lib/nutrition";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function MacroTargetEditor({
  initial,
  onSave,
  onCancel,
  onReset,
  resetLabel,
  saveLabel = "Save",
}: {
  initial: Macros;
  onSave: (targets: Macros) => void;
  onCancel?: () => void;
  onReset?: () => void; // e.g. "remove this day's override"
  resetLabel?: string;
  saveLabel?: string;
}) {
  const [protein, setProtein] = useState(String(initial.protein));
  const [carbs, setCarbs] = useState(String(initial.carbs));
  const [fat, setFat] = useState(String(initial.fat));

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const p = num(protein);
  const c = num(carbs);
  const f = num(fat);
  const calories = caloriesFromMacros(p, c, f);

  function handleSave() {
    onSave({ calories, protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Protein (g)</span>
          <input className={inputClass} inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Carbs (g)</span>
          <input className={inputClass} inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Fat (g)</span>
          <input className={inputClass} inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} />
        </label>
      </div>

      {/* Calories are derived from the macros above. */}
      <div className="flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-sm">
        <span className="text-muted">Calories (from macros)</span>
        <span className="text-lg font-semibold tabular-nums">{calories}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
        >
          {saveLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium"
          >
            Cancel
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium text-muted"
          >
            {resetLabel ?? "Reset"}
          </button>
        )}
      </div>
    </div>
  );
}

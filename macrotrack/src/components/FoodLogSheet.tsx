// =============================================================================
// FoodLogSheet.tsx — a bottom sheet to log a food.
//
// Opens when you tap any food (from search, recents, my foods, a recipe, or a
// barcode scan). You pick a quantity and a date, see the live macro totals, and
// tap "Add to log". If the food isn't already saved, you can also save it to
// "My Foods" for quick reuse later.
// =============================================================================
"use client";

import { useState } from "react";
import {
  logLoggable,
  saveFood,
  scaleMacros,
  type Loggable,
} from "@/lib/foodSearch";
import { todayISO } from "@/lib/dateUtils";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function FoodLogSheet({
  item,
  defaultServings = 1,
  onClose,
}: {
  item: Loggable;
  defaultServings?: number;
  onClose: () => void;
}) {
  const [servings, setServings] = useState(String(defaultServings));
  const [date, setDate] = useState(todayISO());
  const [saved, setSaved] = useState(item.foodId !== undefined);
  const [busy, setBusy] = useState(false);

  const qty = parseFloat(servings) || 0;
  const preview = scaleMacros(item.perServing, qty);
  const servingText = item.servingLabel ?? `${item.servingSize} ${item.servingUnit}`;

  async function handleAdd() {
    if (qty <= 0) return;
    setBusy(true);
    await logLoggable(item, qty, date);
    onClose();
  }

  async function handleSave() {
    if (saved) return;
    setBusy(true);
    await saveFood(item);
    setSaved(true);
    setBusy(false);
  }

  return (
    // Full-screen dim backdrop; tapping it closes the sheet.
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      {/* The sheet itself. stopPropagation so taps inside don't close it. */}
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20" />

        <h2 className="text-lg font-semibold leading-tight">{item.name}</h2>
        {item.brand && <p className="text-sm text-muted">{item.brand}</p>}
        <p className="mt-1 text-xs text-muted">Per serving: {servingText}</p>

        {/* Quantity + date inputs */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Servings</span>
            <input
              className={inputClass}
              inputMode="decimal"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              autoFocus
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

        {/* Live macro preview */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-black/5 dark:bg-white/10 p-3 text-center">
          {[
            { label: "kcal", value: preview.calories },
            { label: "P", value: preview.protein },
            { label: "C", value: preview.carbs },
            { label: "F", value: preview.fat },
          ].map((m) => (
            <div key={m.label}>
              <div className="font-semibold tabular-nums">{m.value}</div>
              <div className="text-xs text-muted">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handleAdd}
            disabled={busy || qty <= 0}
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            Add to log
          </button>
          {!saved ? (
            <button
              onClick={handleSave}
              disabled={busy}
              className="w-full rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium"
            >
              Save to My Foods
            </button>
          ) : (
            <p className="text-center text-sm text-muted">
              {item.foodId !== undefined
                ? "Saved in My Foods"
                : "Added to My Foods ✓"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

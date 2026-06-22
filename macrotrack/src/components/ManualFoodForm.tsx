// =============================================================================
// ManualFoodForm.tsx — quickly add a food to the day's log by typing it in.
//
// You enter the macros for ONE serving plus how many servings you had; the
// entry's totals are serving values × quantity. In Phase 2 we'll add search,
// barcode scanning, and saved foods so most logging is one tap instead.
// =============================================================================
"use client";

import { useState } from "react";
import { db } from "@/lib/db";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function ManualFoodForm({
  date,
  onDone,
}: {
  date: string; // the day to add the entry to
  onDone: () => void; // called after a successful save or cancel
}) {
  const [name, setName] = useState("");
  const [servingLabel, setServingLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please give the food a name.");

    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return setError("Quantity must be greater than 0.");

    // Treat blank macro fields as 0. parseFloat("") is NaN, so default it.
    const num = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };
    const perCal = num(calories);
    const perP = num(protein);
    const perC = num(carbs);
    const perF = num(fat);

    try {
      setSaving(true);
      await db.logEntries.add({
        date,
        name: name.trim(),
        servingLabel: servingLabel.trim() || undefined,
        servings: qty,
        computed: {
          calories: perCal * qty,
          protein: perP * qty,
          carbs: perC * qty,
          fat: perF * qty,
        },
        createdAt: Date.now(),
      });
      onDone();
    } catch {
      setError("Couldn't save that entry. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4"
    >
      <input
        className={inputClass}
        placeholder="Food name (e.g. Greek yogurt)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className={inputClass}
        placeholder="Serving size (optional, e.g. 1 cup / 170 g)"
        value={servingLabel}
        onChange={(e) => setServingLabel(e.target.value)}
      />

      <p className="text-xs text-muted">Per one serving:</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Calories</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Protein (g)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Carbs (g)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Fat (g)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Quantity (servings)</span>
        <input
          className={inputClass}
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add to log"}
        </button>
      </div>
    </form>
  );
}

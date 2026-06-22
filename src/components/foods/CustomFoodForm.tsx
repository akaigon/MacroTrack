// =============================================================================
// CustomFoodForm.tsx — create (or edit) a reusable custom food.
//
// Saved to the foods table with source "custom". You define a serving size and
// the macros for one serving; logging later just multiplies by a quantity.
// =============================================================================
"use client";

import { useState } from "react";
import { db, type Food } from "@/lib/db";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function CustomFoodForm({
  existing,
  onDone,
}: {
  existing?: Food; // when provided, we edit instead of create
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [servingSize, setServingSize] = useState(
    String(existing?.servingSize ?? 100)
  );
  const [servingUnit, setServingUnit] = useState(existing?.servingUnit ?? "g");
  const [calories, setCalories] = useState(
    existing ? String(existing.perServing.calories) : ""
  );
  const [protein, setProtein] = useState(
    existing ? String(existing.perServing.protein) : ""
  );
  const [carbs, setCarbs] = useState(
    existing ? String(existing.perServing.carbs) : ""
  );
  const [fat, setFat] = useState(
    existing ? String(existing.perServing.fat) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please give the food a name.");
    if (num(servingSize) <= 0)
      return setError("Serving size must be greater than 0.");

    const data = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      source: "custom" as const,
      servingSize: num(servingSize),
      servingUnit: servingUnit.trim() || "g",
      perServing: {
        calories: num(calories),
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
      },
    };

    try {
      setBusy(true);
      if (existing?.id !== undefined) {
        await db.foods.update(existing.id, data);
      } else {
        await db.foods.add({ ...data, favorite: false, createdAt: Date.now() });
      }
      onDone();
    } catch {
      setError("Couldn't save. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4"
    >
      <input
        className={inputClass}
        placeholder="Food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className={inputClass}
        placeholder="Brand (optional)"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Serving size</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Unit</span>
          <input
            className={inputClass}
            placeholder="g, ml, piece…"
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value)}
          />
        </label>
      </div>

      <p className="text-xs text-muted">Per one serving:</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Calories</span>
          <input className={inputClass} inputMode="decimal" value={calories} onChange={(e) => setCalories(e.target.value)} />
        </label>
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
          disabled={busy}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {existing ? "Save changes" : "Create food"}
        </button>
      </div>
    </form>
  );
}

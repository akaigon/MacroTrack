// =============================================================================
// RecipeBuilder.tsx — combine saved foods into a recipe.
//
// You pick ingredients from My Foods, set how many servings of each go in, and
// say how many servings the whole recipe makes. We compute the per-serving
// macros live (total of all ingredients ÷ servings made) and save it as a
// recipe you can log like any other food.
//
// Note: ingredients come from your saved foods, so save a custom food (or a
// searched food via "Save to My Foods") before building a recipe.
// =============================================================================
"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Recipe, type RecipeItem } from "@/lib/db";
import { sumMacros } from "@/lib/nutrition";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function RecipeBuilder({
  existing,
  onDone,
}: {
  existing?: Recipe;
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [servingsMade, setServingsMade] = useState(
    String(existing?.servingsMade ?? 1)
  );
  const [items, setItems] = useState<RecipeItem[]>(existing?.items ?? []);
  const [pickId, setPickId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Saved foods available as ingredients.
  const foods = useLiveQuery(() => db.foods.toArray(), [], []);

  // Quick lookup from foodId → food, for showing names and computing macros.
  const foodById = useMemo(() => {
    const map = new Map<number, (typeof foods)[number]>();
    for (const f of foods ?? []) if (f.id !== undefined) map.set(f.id, f);
    return map;
  }, [foods]);

  // Total macros of all ingredients, and the per-serving result.
  const total = sumMacros(
    items.map((it) => {
      const f = foodById.get(it.foodId);
      if (!f) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
      return {
        calories: f.perServing.calories * it.servings,
        protein: f.perServing.protein * it.servings,
        carbs: f.perServing.carbs * it.servings,
        fat: f.perServing.fat * it.servings,
      };
    })
  );
  const made = parseFloat(servingsMade) || 1;
  const perServing = {
    calories: Math.round(total.calories / made),
    protein: Math.round((total.protein / made) * 10) / 10,
    carbs: Math.round((total.carbs / made) * 10) / 10,
    fat: Math.round((total.fat / made) * 10) / 10,
  };

  function addItem() {
    const id = parseInt(pickId);
    if (!id) return;
    // If already added, just bump nothing; otherwise add with 1 serving.
    if (!items.some((it) => it.foodId === id)) {
      setItems((prev) => [...prev, { foodId: id, servings: 1 }]);
    }
    setPickId("");
  }

  function setServings(foodId: number, servings: number) {
    setItems((prev) =>
      prev.map((it) => (it.foodId === foodId ? { ...it, servings } : it))
    );
  }

  function removeItem(foodId: number) {
    setItems((prev) => prev.filter((it) => it.foodId !== foodId));
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Please name the recipe.");
    if (items.length === 0) return setError("Add at least one ingredient.");
    if (made <= 0) return setError("Servings made must be greater than 0.");

    const data = {
      name: name.trim(),
      items,
      servingsMade: made,
      perServing,
    };

    try {
      setBusy(true);
      if (existing?.id !== undefined) {
        await db.recipes.update(existing.id, data);
      } else {
        await db.recipes.add({ ...data, createdAt: Date.now() });
      }
      onDone();
    } catch {
      setError("Couldn't save the recipe. Please try again.");
      setBusy(false);
    }
  }

  const hasFoods = (foods ?? []).length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
      <input
        className={inputClass}
        placeholder="Recipe name (e.g. Chicken stir-fry)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      {/* Ingredient picker */}
      {hasFoods ? (
        <div className="flex gap-2">
          <select
            className={inputClass}
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
          >
            <option value="">Add an ingredient…</option>
            {(foods ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="shrink-0 rounded-xl bg-accent px-4 font-semibold text-white"
          >
            Add
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Save some foods in “My Foods” first, then add them here as
          ingredients.
        </p>
      )}

      {/* Ingredient list */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => {
            const f = foodById.get(it.foodId);
            return (
              <li
                key={it.foodId}
                className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 p-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {f?.name ?? "(deleted food)"}
                </span>
                <input
                  className="w-20 rounded-lg border border-black/10 dark:border-white/15 bg-card px-2 py-1 text-sm"
                  inputMode="decimal"
                  value={it.servings}
                  onChange={(e) =>
                    setServings(it.foodId, parseFloat(e.target.value) || 0)
                  }
                  aria-label="servings"
                />
                <span className="text-xs text-muted">srv</span>
                <button
                  onClick={() => removeItem(it.foodId)}
                  className="px-2 text-muted"
                  aria-label="Remove ingredient"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Servings made + per-serving preview */}
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Servings the recipe makes</span>
        <input
          className={inputClass}
          inputMode="decimal"
          value={servingsMade}
          onChange={(e) => setServingsMade(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-black/5 dark:bg-white/10 p-3 text-center">
        <div>
          <div className="font-semibold tabular-nums">{perServing.calories}</div>
          <div className="text-xs text-muted">kcal/srv</div>
        </div>
        <div>
          <div className="font-semibold tabular-nums">{perServing.protein}</div>
          <div className="text-xs text-muted">P</div>
        </div>
        <div>
          <div className="font-semibold tabular-nums">{perServing.carbs}</div>
          <div className="text-xs text-muted">C</div>
        </div>
        <div>
          <div className="font-semibold tabular-nums">{perServing.fat}</div>
          <div className="text-xs text-muted">F</div>
        </div>
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
          onClick={handleSave}
          disabled={busy}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {existing ? "Save changes" : "Create recipe"}
        </button>
      </div>
    </div>
  );
}

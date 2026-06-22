// =============================================================================
// MyFoodsTab.tsx — your saved custom foods.
//
// Lists everything in the foods table (favorites first). Tap a food to log it,
// star it to favorite, or use the menu to edit/delete. The "+ New food" button
// opens the custom-food form.
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Food } from "@/lib/db";
import {
  foodToLoggable,
  toggleFavorite,
  deleteFood,
  type Loggable,
} from "@/lib/foodSearch";
import FoodRow from "./FoodRow";
import CustomFoodForm from "./CustomFoodForm";

export default function MyFoodsTab({
  onPick,
}: {
  onPick: (item: Loggable) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);

  // All saved foods, newest first, with favorites pulled to the top.
  const foods = useLiveQuery(async () => {
    const all = await db.foods.orderBy("createdAt").reverse().toArray();
    return all.sort(
      (a, b) => Number(b.favorite ?? false) - Number(a.favorite ?? false)
    );
  });

  if (editing) {
    return (
      <CustomFoodForm existing={editing} onDone={() => setEditing(null)} />
    );
  }

  return (
    <div className="space-y-4">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
        >
          + New food
        </button>
      ) : (
        <CustomFoodForm onDone={() => setCreating(false)} />
      )}

      {foods && foods.length > 0 ? (
        <ul className="space-y-2">
          {foods.map((f) => (
            <FoodRow
              key={f.id}
              title={f.name}
              subtitle={[f.brand, `per ${f.servingSize} ${f.servingUnit}`]
                .filter(Boolean)
                .join(" · ")}
              calories={f.perServing.calories}
              onClick={() => onPick(foodToLoggable(f))}
              actions={
                <>
                  <button
                    onClick={() => toggleFavorite(f)}
                    aria-label="Toggle favorite"
                    className="px-1.5 py-1 text-lg leading-none"
                    title="Favorite"
                  >
                    <span className={f.favorite ? "text-accent" : "text-muted"}>
                      {f.favorite ? "★" : "☆"}
                    </span>
                  </button>
                  <button
                    onClick={() => setEditing(f)}
                    aria-label="Edit"
                    className="px-1.5 py-1 text-sm text-muted"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => f.id && deleteFood(f.id)}
                    aria-label="Delete"
                    className="px-1.5 py-1 text-sm text-muted"
                    title="Delete"
                  >
                    ✕
                  </button>
                </>
              }
            />
          ))}
        </ul>
      ) : (
        !creating && (
          <p className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center text-sm text-muted">
            No saved foods yet. Create one above, or tap “Save to My Foods” when
            logging a food you found by search or barcode.
          </p>
        )
      )}
    </div>
  );
}

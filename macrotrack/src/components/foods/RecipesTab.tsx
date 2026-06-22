// =============================================================================
// RecipesTab.tsx — your saved recipes.
//
// Lists recipes (tap to log one serving), with edit/delete, and a "+ New
// recipe" button that opens the builder.
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Recipe } from "@/lib/db";
import { recipeToLoggable, type Loggable } from "@/lib/foodSearch";
import FoodRow from "./FoodRow";
import RecipeBuilder from "./RecipeBuilder";

export default function RecipesTab({
  onPick,
}: {
  onPick: (item: Loggable) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);

  const recipes = useLiveQuery(() =>
    db.recipes.orderBy("createdAt").reverse().toArray()
  );

  if (editing) {
    return <RecipeBuilder existing={editing} onDone={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-4">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
        >
          + New recipe
        </button>
      ) : (
        <RecipeBuilder onDone={() => setCreating(false)} />
      )}

      {recipes && recipes.length > 0 ? (
        <ul className="space-y-2">
          {recipes.map((r) => (
            <FoodRow
              key={r.id}
              title={r.name}
              subtitle={`${r.items.length} ingredient${
                r.items.length === 1 ? "" : "s"
              } · makes ${r.servingsMade} · per serving`}
              calories={r.perServing.calories}
              onClick={() => onPick(recipeToLoggable(r))}
              actions={
                <>
                  <button
                    onClick={() => setEditing(r)}
                    className="px-1.5 py-1 text-sm text-muted"
                    aria-label="Edit recipe"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => r.id && db.recipes.delete(r.id)}
                    className="px-1.5 py-1 text-sm text-muted"
                    aria-label="Delete recipe"
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
            No recipes yet. Build one from your saved foods.
          </p>
        )
      )}
    </div>
  );
}

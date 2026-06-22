// =============================================================================
// Foods page — three sub-tabs: Search, My Foods, and Recipes.
//
// Whatever tab you're on, tapping a food opens the shared FoodLogSheet so you
// can pick a quantity/date and add it to your log.
// =============================================================================
"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import FoodLogSheet from "@/components/FoodLogSheet";
import SearchTab from "@/components/foods/SearchTab";
import MyFoodsTab from "@/components/foods/MyFoodsTab";
import RecipesTab from "@/components/foods/RecipesTab";
import type { Loggable } from "@/lib/foodSearch";

type Tab = "search" | "foods" | "recipes";

const TABS: { id: Tab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "foods", label: "My Foods" },
  { id: "recipes", label: "Recipes" },
];

export default function FoodsPage() {
  const [tab, setTab] = useState<Tab>("search");
  // The food currently being logged (opens the bottom sheet when set).
  const [picked, setPicked] = useState<Loggable | null>(null);

  return (
    <div>
      <PageHeader title="Foods" subtitle="Search, scan, save, and log foods." />

      {/* Sub-tab switcher */}
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-black/5 dark:bg-white/10 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-card text-accent shadow-sm" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && <SearchTab onPick={setPicked} />}
      {tab === "foods" && <MyFoodsTab onPick={setPicked} />}
      {tab === "recipes" && <RecipesTab onPick={setPicked} />}

      {picked && (
        <FoodLogSheet item={picked} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

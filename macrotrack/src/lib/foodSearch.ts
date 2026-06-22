// =============================================================================
// foodSearch.ts — the bridge between the UI and our search API + database.
//
// Contains:
//   - FoodSearchResult: the normalized shape every search/barcode result uses.
//   - Loggable: anything the "log this food" sheet can handle (a search result,
//     a saved food, a recipe, or a recent entry).
//   - client functions to call /api/search and /api/barcode.
//   - helpers to add a log entry, save a custom food, and read recents.
// =============================================================================

import { db, type Food, type Macros, type LogEntry, type Recipe } from "./db";

// A normalized result from either food database (always per the given serving).
export interface FoodSearchResult {
  source: "off" | "usda";
  name: string;
  brand?: string;
  barcode?: string;
  servingSize: number; // e.g. 100
  servingUnit: string; // e.g. "g"
  perServing: Macros;
}

// Anything that can be sent to the log sheet. It carries enough to both LOG it
// and (optionally) SAVE it to My Foods. `foodId` is set when it's already saved.
export interface Loggable {
  name: string;
  brand?: string;
  source: Food["source"];
  barcode?: string;
  servingSize: number;
  servingUnit: string;
  perServing: Macros;
  foodId?: number;
  // Optional display label for the serving (used by recents, where one
  // "serving" is the exact portion eaten last time). Falls back to
  // `${servingSize} ${servingUnit}` when not set.
  servingLabel?: string;
}

// ---- API calls (run in the browser, hit our own server routes) ----

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as { results: FoodSearchResult[] };
  return data.results;
}

export async function lookupBarcode(
  code: string
): Promise<FoodSearchResult | null> {
  const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { product: FoodSearchResult | null };
  return data.product;
}

// ---- Database helpers ----

// Multiply a per-serving macro bundle by a quantity, rounding to keep it tidy.
export function scaleMacros(perServing: Macros, qty: number): Macros {
  return {
    calories: Math.round(perServing.calories * qty),
    protein: round1(perServing.protein * qty),
    carbs: round1(perServing.carbs * qty),
    fat: round1(perServing.fat * qty),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Add a log entry for a loggable food on a given date.
export async function logLoggable(
  item: Loggable,
  servings: number,
  date: string
): Promise<void> {
  const entry: LogEntry = {
    date,
    name: item.name,
    servingLabel: item.servingLabel ?? `${item.servingSize} ${item.servingUnit}`,
    foodId: item.foodId,
    servings,
    computed: scaleMacros(item.perServing, servings),
    createdAt: Date.now(),
  };
  await db.logEntries.add(entry);
}

// Save a loggable to the foods table ("My Foods") so it can be reused/favorited.
// Returns the saved food's id.
export async function saveFood(
  item: Loggable,
  favorite = false
): Promise<number> {
  const food: Food = {
    name: item.name,
    brand: item.brand,
    source: item.source,
    barcode: item.barcode,
    servingSize: item.servingSize,
    servingUnit: item.servingUnit,
    perServing: item.perServing,
    favorite,
    createdAt: Date.now(),
  };
  return (await db.foods.add(food)) as number;
}

// Toggle a saved food's "favorite" star.
export async function toggleFavorite(food: Food): Promise<void> {
  if (food.id === undefined) return;
  await db.foods.update(food.id, { favorite: !food.favorite });
}

// Remove a saved food from My Foods (does not touch past log entries).
export async function deleteFood(id: number): Promise<void> {
  await db.foods.delete(id);
}

// Build a Loggable from a saved Food row.
export function foodToLoggable(food: Food): Loggable {
  return {
    name: food.name,
    brand: food.brand,
    source: food.source,
    barcode: food.barcode,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    perServing: food.perServing,
    foodId: food.id,
  };
}

// Build a Loggable from a recipe (one serving of the recipe).
export function recipeToLoggable(recipe: Recipe): Loggable {
  return {
    name: recipe.name,
    source: "recipe",
    servingSize: 1,
    servingUnit: "serving",
    perServing: recipe.perServing,
    servingLabel: "1 serving",
  };
}

// Build a Loggable from a search/barcode result.
export function resultToLoggable(r: FoodSearchResult): Loggable {
  return {
    name: r.name,
    brand: r.brand,
    source: r.source,
    barcode: r.barcode,
    servingSize: r.servingSize,
    servingUnit: r.servingUnit,
    perServing: r.perServing,
  };
}

// ---- Recents ----

// A "recent" re-logs a food the way you logged it last time. We treat the
// whole portion you ate as one "serving", so a single tap reproduces it
// exactly (and you can still bump the quantity in the sheet).
export async function getRecents(limit = 12): Promise<Loggable[]> {
  // Pull the latest entries and de-duplicate by name (newest wins).
  const entries = await db.logEntries
    .orderBy("createdAt")
    .reverse()
    .limit(150)
    .toArray();

  const seen = new Set<string>();
  const recents: Loggable[] = [];
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recents.push({
      name: e.name,
      source: "custom",
      servingSize: 1,
      servingUnit: "portion",
      // One serving = the exact amount eaten in that entry.
      perServing: { ...e.computed },
      servingLabel: e.servingLabel,
      foodId: e.foodId,
    });
    if (recents.length >= limit) break;
  }
  return recents;
}

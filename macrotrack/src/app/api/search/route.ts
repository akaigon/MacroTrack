// =============================================================================
// /api/search — server-side food search.
//
// This runs on the SERVER, not in the browser. That matters because the USDA
// FoodData Central API needs a key: keeping the request server-side means the
// key (read from the FDC_API_KEY env var) is never exposed to your phone.
//
// We query two free databases and merge the results into one normalized shape:
//   - Open Food Facts (no key needed) — great for barcoded/branded products.
//   - USDA FoodData Central (needs a free key) — great for whole foods.
//
// Every result is normalized to "per 100 g" so the UI can treat them the same.
// =============================================================================

import { NextResponse } from "next/server";
import type { FoodSearchResult } from "@/lib/foodSearch";

// Always run fresh (don't cache a search query at build time).
export const dynamic = "force-dynamic";

// ---- Open Food Facts ----
async function searchOpenFoodFacts(
  query: string
): Promise<FoodSearchResult[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "20",
      fields: "product_name,brands,code,nutriments",
    }).toString();

  const res = await fetch(url, {
    // Open Food Facts asks API users to identify themselves.
    headers: { "User-Agent": "MacroTrack/1.0 (personal tracker)" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { products?: OffProduct[] };
  const results: FoodSearchResult[] = [];

  for (const p of data.products ?? []) {
    const name = p.product_name?.trim();
    if (!name) continue;
    const n = p.nutriments ?? {};
    const calories = offKcalPer100g(n);
    // Skip products with no usable energy value.
    if (!calories) continue;

    results.push({
      source: "off",
      name,
      brand: p.brands?.split(",")[0]?.trim() || undefined,
      barcode: p.code || undefined,
      servingSize: 100,
      servingUnit: "g",
      perServing: {
        calories: Math.round(calories),
        protein: round1(num(n.proteins_100g)),
        carbs: round1(num(n.carbohydrates_100g)),
        fat: round1(num(n.fat_100g)),
      },
    });
  }
  return results;
}

// Energy can be reported as kcal directly, or only in kJ — handle both.
function offKcalPer100g(n: OffNutriments): number {
  if (num(n["energy-kcal_100g"])) return num(n["energy-kcal_100g"]);
  if (num(n.energy_100g)) return num(n.energy_100g) / 4.184; // kJ → kcal
  return 0;
}

// ---- USDA FoodData Central ----
async function searchUsda(query: string): Promise<FoodSearchResult[]> {
  const key = process.env.FDC_API_KEY;
  if (!key) return []; // no key set → just skip USDA, OFF still works

  const url =
    "https://api.nal.usda.gov/fdc/v1/foods/search?" +
    new URLSearchParams({
      api_key: key,
      query,
      pageSize: "20",
      dataType: "Branded,Foundation,SR Legacy",
    }).toString();

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as { foods?: UsdaFood[] };
  const results: FoodSearchResult[] = [];

  for (const f of data.foods ?? []) {
    const name = f.description?.trim();
    if (!name) continue;
    const macros = usdaMacrosPer100g(f.foodNutrients ?? []);
    if (!macros.calories) continue;

    results.push({
      source: "usda",
      name,
      brand: f.brandName?.trim() || f.brandOwner?.trim() || undefined,
      barcode: f.gtinUpc || undefined,
      servingSize: 100,
      servingUnit: "g",
      perServing: macros,
    });
  }
  return results;
}

// USDA reports nutrients in an array; map the four we care about by their
// standard nutrient IDs (1008 energy kcal, 1003 protein, 1004 fat, 1005 carbs).
function usdaMacrosPer100g(nutrients: UsdaNutrient[]) {
  const byId = (id: number) =>
    num(nutrients.find((x) => x.nutrientId === id)?.value);
  return {
    calories: Math.round(byId(1008)),
    protein: round1(byId(1003)),
    carbs: round1(byId(1005)),
    fat: round1(byId(1004)),
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  // Query both sources in parallel; if one fails, still return the other.
  const [off, usda] = await Promise.allSettled([
    searchOpenFoodFacts(query),
    searchUsda(query),
  ]);

  const results: FoodSearchResult[] = [
    ...(off.status === "fulfilled" ? off.value : []),
    ...(usda.status === "fulfilled" ? usda.value : []),
  ];

  return NextResponse.json({ results });
}

// ---- tiny helpers ----
function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---- response shapes from the external APIs (only the fields we read) ----
interface OffNutriments {
  "energy-kcal_100g"?: number | string;
  energy_100g?: number | string;
  proteins_100g?: number | string;
  carbohydrates_100g?: number | string;
  fat_100g?: number | string;
}
interface OffProduct {
  product_name?: string;
  brands?: string;
  code?: string;
  nutriments?: OffNutriments;
}
interface UsdaNutrient {
  nutrientId?: number;
  value?: number;
}
interface UsdaFood {
  description?: string;
  brandName?: string;
  brandOwner?: string;
  gtinUpc?: string;
  foodNutrients?: UsdaNutrient[];
}

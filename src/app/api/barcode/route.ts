// =============================================================================
// /api/barcode — look up a single product by its barcode in Open Food Facts.
//
// Used after the camera scans a barcode. Returns one normalized food (per
// 100 g) or { product: null } if nothing was found.
// =============================================================================

import { NextResponse } from "next/server";
import type { FoodSearchResult } from "@/lib/foodSearch";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return NextResponse.json({ product: null });

  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      code
    )}?` +
    new URLSearchParams({
      fields: "product_name,brands,code,nutriments",
    }).toString();

  const res = await fetch(url, {
    headers: { "User-Agent": "MacroTrack/1.0 (personal tracker)" },
  });
  if (!res.ok) return NextResponse.json({ product: null });

  const data = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      code?: string;
      nutriments?: Record<string, number | string>;
    };
  };

  // status 1 = found, 0 = not found.
  if (data.status !== 1 || !data.product?.product_name) {
    return NextResponse.json({ product: null });
  }

  const p = data.product;
  const n = p.nutriments ?? {};
  const kcalRaw = num(n["energy-kcal_100g"]) || num(n.energy_100g) / 4.184;

  const product: FoodSearchResult = {
    source: "off",
    name: p.product_name!.trim(),
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    barcode: p.code || code,
    servingSize: 100,
    servingUnit: "g",
    perServing: {
      calories: Math.round(kcalRaw) || 0,
      protein: round1(num(n.proteins_100g)),
      carbs: round1(num(n.carbohydrates_100g)),
      fat: round1(num(n.fat_100g)),
    },
  };

  return NextResponse.json({ product });
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

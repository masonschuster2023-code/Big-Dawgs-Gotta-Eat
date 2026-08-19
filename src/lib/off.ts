// Server-only client for Open Food Facts. No API key required, but kept
// server-side for consistency and to avoid CORS surprises client-side.
import "server-only";

export interface OffProduct {
  name: string;
  // Always per-100g — Open Food Facts' *_100g nutriment fields, unscaled.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // OFF's raw label text, e.g. "1 bar (55 g)" — display only, not
  // guaranteed to parse to a number.
  servingSize: string | null;
  // The actual gram weight of one serving, when OFF reports it (either
  // via serving_quantity directly, or parsed out of servingSize as a
  // fallback). Null when genuinely unknown — callers should not assume
  // 100g in that case, just that there's nothing better to default to.
  servingQuantityG: number | null;
}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

// OFF reports serving_quantity as a plain number for most products, but
// it's occasionally a numeric string, and a small share of entries are
// missing it entirely despite having a servingSize label that mentions
// grams — so this falls back to parsing that label before giving up.
function parseServingQuantityG(
  servingQuantity: number | string | undefined,
  servingSize: string | null | undefined,
): number | null {
  if (typeof servingQuantity === "number" && servingQuantity > 0) return servingQuantity;
  if (typeof servingQuantity === "string" && Number(servingQuantity) > 0) {
    return Number(servingQuantity);
  }
  const match = servingSize?.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? Number(match[1]) : null;
}

export async function lookupOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments,serving_size,serving_quantity,brands`,
    { headers: { "User-Agent": "BigDawgsGottaEat/1.0 (personal tracking app)" } },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product as {
    product_name?: string;
    brands?: string;
    serving_size?: string;
    serving_quantity?: number | string;
    nutriments?: OffNutriments;
  };

  const nutriments = product.nutriments ?? {};
  const name = [product.brands, product.product_name].filter(Boolean).join(" — ") || barcode;
  const servingSize = product.serving_size ?? null;

  return {
    name,
    calories: nutriments["energy-kcal_100g"] ?? 0,
    protein: nutriments.proteins_100g ?? 0,
    carbs: nutriments.carbohydrates_100g ?? 0,
    fat: nutriments.fat_100g ?? 0,
    servingSize,
    servingQuantityG: parseServingQuantityG(product.serving_quantity, servingSize),
  };
}

// Server-only client for Open Food Facts. No API key required, but kept
// server-side for consistency and to avoid CORS surprises client-side.
import "server-only";

export interface OffProduct {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

export async function lookupOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments,serving_size,brands`,
    { headers: { "User-Agent": "BigDawgsGottaEat/1.0 (personal tracking app)" } },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product as {
    product_name?: string;
    brands?: string;
    serving_size?: string;
    nutriments?: OffNutriments;
  };

  const nutriments = product.nutriments ?? {};
  const name = [product.brands, product.product_name].filter(Boolean).join(" — ") || barcode;

  return {
    name,
    calories: nutriments["energy-kcal_100g"] ?? 0,
    protein: nutriments.proteins_100g ?? 0,
    carbs: nutriments.carbohydrates_100g ?? 0,
    fat: nutriments.fat_100g ?? 0,
    servingSize: product.serving_size ?? null,
  };
}

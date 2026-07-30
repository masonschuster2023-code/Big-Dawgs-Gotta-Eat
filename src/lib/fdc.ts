// Server-only client for USDA FoodData Central. Never import this from a
// client component — FDC_API_KEY has no NEXT_PUBLIC_ prefix so it can't be
// bundled to the browser, but importing this file from client code would
// still break the build.
import "server-only";

const FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// Foundation/SR Legacy/Survey (FNDDS) report nutrients per 100g. Branded is
// excluded deliberately — packaged/barcoded items are covered by the Open
// Food Facts barcode flow, and pulling them from USDA too just creates
// duplicate/conflicting results for the same product.
const WHOLE_FOOD_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

const NUTRIENT_NUMBERS = {
  // Foundation Foods often omit the classic "208" Energy entry and instead
  // report Atwater factor variants (957/958) — prefer 208 when present,
  // otherwise fall back to specific, then general, factors.
  calories: ["208", "958", "957"],
  protein: ["203"],
  carbs: ["205"],
  fat: ["204"],
} as const;

export interface FdcMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FdcSearchResult extends FdcMacros {
  fdcId: number;
  description: string;
  dataType: string;
}

// The search endpoint returns a flat shape; the single-food detail endpoint
// nests the nutrient definition under `nutrient`. Support both.
interface FdcNutrient {
  nutrientNumber?: string;
  value?: number;
  amount?: number;
  nutrient?: { number?: string };
}

function extractMacros(nutrients: FdcNutrient[]): FdcMacros {
  const byNumber = new Map<string, number>();

  for (const nutrient of nutrients ?? []) {
    const number = nutrient.nutrientNumber ?? nutrient.nutrient?.number;
    const value = nutrient.value ?? nutrient.amount ?? 0;
    if (number) byNumber.set(number, value);
  }

  const firstMatch = (numbers: readonly string[]) => {
    for (const n of numbers) {
      const value = byNumber.get(n);
      if (value !== undefined) return value;
    }
    return 0;
  };

  return {
    calories: firstMatch(NUTRIENT_NUMBERS.calories),
    protein: firstMatch(NUTRIENT_NUMBERS.protein),
    carbs: firstMatch(NUTRIENT_NUMBERS.carbs),
    fat: firstMatch(NUTRIENT_NUMBERS.fat),
  };
}

function apiKey(): string {
  const key = process.env.FDC_API_KEY;
  if (!key) throw new Error("FDC_API_KEY is not configured");
  return key;
}

export async function searchFdcFoods(query: string): Promise<FdcSearchResult[]> {
  const res = await fetch(`${FDC_BASE_URL}/foods/search?api_key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      dataType: WHOLE_FOOD_DATA_TYPES,
      pageSize: 20,
    }),
  });

  if (!res.ok) {
    throw new Error(`FDC search failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  return (data.foods ?? []).map(
    (food: { fdcId: number; description: string; dataType: string; foodNutrients: FdcNutrient[] }) => ({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      ...extractMacros(food.foodNutrients),
    }),
  );
}

export async function getFdcFoodDetail(
  fdcId: number,
): Promise<{ description: string } & FdcMacros> {
  const res = await fetch(`${FDC_BASE_URL}/food/${fdcId}?api_key=${apiKey()}`);

  if (!res.ok) {
    throw new Error(`FDC detail lookup failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  return {
    description: data.description,
    ...extractMacros(data.foodNutrients),
  };
}

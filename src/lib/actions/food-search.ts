"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchFdcFoods } from "@/lib/fdc";
import type { Meal } from "@/lib/supabase/database.types";

export type SearchResultOrigin = "recent" | "catalog" | "usda";

export interface FoodSearchResult {
  origin: SearchResultOrigin;
  // Set for "recent" — an existing row in the user's own foods table.
  // Quantity for these is a generic multiplier, matching whatever serving
  // that row was originally defined against (not necessarily per-100g).
  personalFoodId?: string;
  // Set for "catalog" and "usda" — always per-100g macros.
  fdcId?: string;
  name: string;
  brand?: string | null;
  servingSize?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const RESULT_LIMIT = 8;

export async function searchFoodDatabase(
  query: string,
): Promise<{ results?: FoodSearchResult[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    // Tier 1: this user's own logging history (fastest path back to a food
    // they've already used, and the only tier where quantity isn't
    // necessarily per-100g).
    const { data: recentFoods } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id)
      .ilike("name", `%${trimmed}%`)
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT);

    const recent: FoodSearchResult[] = (recentFoods ?? []).map((f) => ({
      origin: "recent",
      personalFoodId: f.id,
      fdcId: f.fdc_id ?? undefined,
      name: f.name,
      servingSize: f.serving_size,
      calories: Number(f.calories),
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fat: Number(f.fat),
    }));

    const seenFdcIds = new Set(recent.map((r) => r.fdcId).filter(Boolean));

    // Tier 2: the shared catalog — verified USDA data anyone has already
    // looked up, so most common foods never need a live API call.
    const { data: catalogFoods } = await supabase
      .from("food_catalog")
      .select("*")
      .or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
      .limit(RESULT_LIMIT);

    const catalog: FoodSearchResult[] = (catalogFoods ?? [])
      .filter((f) => !seenFdcIds.has(f.fdc_id))
      .map((f) => ({
        origin: "catalog",
        fdcId: f.fdc_id,
        name: f.name,
        brand: f.brand,
        servingSize: f.serving_size ? `${f.serving_size} ${f.serving_unit ?? "g"}` : "100 g",
        calories: Number(f.calories),
        protein: Number(f.protein),
        carbs: Number(f.carbs),
        fat: Number(f.fat),
      }));

    if (recent.length + catalog.length > 0) {
      return { results: [...recent, ...catalog] };
    }

    // Tier 3: nothing local at all — call USDA live and cache every result
    // into the shared catalog so nobody (including this user, next time)
    // has to make this call again for the same food.
    const fdcResults = await searchFdcFoods(trimmed);

    if (fdcResults.length > 0) {
      await supabase.from("food_catalog").upsert(
        fdcResults.map((r) => ({
          fdc_id: String(r.fdcId),
          name: r.description,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fat: r.fat,
          serving_size: 100,
          serving_unit: "g",
        })),
        { onConflict: "fdc_id" },
      );
    }

    const usda: FoodSearchResult[] = fdcResults.map((r) => ({
      origin: "usda",
      fdcId: String(r.fdcId),
      name: r.description,
      servingSize: "100 g",
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    }));

    return { results: usda };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Search failed" };
  }
}

export async function addSearchResultToLog(
  date: string,
  meal: Meal,
  result: FoodSearchResult,
  quantity: number,
) {
  if (!(quantity > 0)) throw new Error("Quantity must be greater than 0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let foodId = result.personalFoodId;

  if (!foodId) {
    if (!result.fdcId) throw new Error("Missing food reference");

    const { data: existing } = await supabase
      .from("foods")
      .select("id")
      .eq("user_id", user.id)
      .eq("fdc_id", result.fdcId)
      .maybeSingle();

    if (existing) {
      foodId = existing.id;
    } else {
      const { data: food, error: foodError } = await supabase
        .from("foods")
        .insert({
          user_id: user.id,
          name: result.brand ? `${result.brand} — ${result.name}` : result.name,
          source: "database_search",
          fdc_id: result.fdcId,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          serving_size: result.servingSize ?? "100 g",
        })
        .select("id")
        .single();

      if (foodError || !food) throw new Error(foodError?.message ?? "Could not save food");
      foodId = food.id;
    }
  }

  const { data: dailyLog, error: dailyLogError } = await supabase
    .from("daily_logs")
    .upsert({ user_id: user.id, date }, { onConflict: "user_id,date" })
    .select("id")
    .single();

  if (dailyLogError || !dailyLog) {
    throw new Error(dailyLogError?.message ?? "Could not create daily log");
  }

  const { error: logError } = await supabase.from("food_logs").insert({
    user_id: user.id,
    daily_log_id: dailyLog.id,
    food_id: foodId,
    quantity,
    meal,
  });

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
}

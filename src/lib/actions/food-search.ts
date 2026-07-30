"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchFdcFoods, getFdcFoodDetail, type FdcSearchResult } from "@/lib/fdc";
import type { Meal } from "@/lib/supabase/database.types";

export async function searchFoodDatabase(
  query: string,
): Promise<{ results?: FdcSearchResult[]; error?: string }> {
  if (!query.trim()) return { results: [] };

  try {
    const results = await searchFdcFoods(query.trim());
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Search failed" };
  }
}

export async function addSearchedFood(
  date: string,
  meal: Meal,
  fdcId: number,
  description: string,
  grams: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fdcIdStr = String(fdcId);

  // Only hit USDA again if we haven't cached this food before — the free
  // key is capped at 1,000 requests/hour, and repeated lookups of foods
  // the user eats often would burn through that fast otherwise.
  const { data: cached } = await supabase
    .from("foods")
    .select("id")
    .eq("user_id", user.id)
    .eq("fdc_id", fdcIdStr)
    .maybeSingle();

  let foodId = cached?.id;

  if (!foodId) {
    const detail = await getFdcFoodDetail(fdcId);

    const { data: food, error: foodError } = await supabase
      .from("foods")
      .insert({
        user_id: user.id,
        name: detail.description || description,
        source: "database_search",
        fdc_id: fdcIdStr,
        calories: detail.calories,
        protein: detail.protein,
        carbs: detail.carbs,
        fat: detail.fat,
        serving_size: "100 g",
      })
      .select("id")
      .single();

    if (foodError || !food) throw new Error(foodError?.message ?? "Could not cache food");
    foodId = food.id;
  }

  const { data: dailyLog, error: dailyLogError } = await supabase
    .from("daily_logs")
    .upsert({ user_id: user.id, date }, { onConflict: "user_id,date" })
    .select("id")
    .single();

  if (dailyLogError || !dailyLog) {
    throw new Error(dailyLogError?.message ?? "Could not create daily log");
  }

  // grams / 100 because Foundation/SR Legacy/Survey (FNDDS) foods store
  // macros per 100g, and food_logs.quantity multiplies the food's stored
  // macro values directly.
  const { error: logError } = await supabase.from("food_logs").insert({
    user_id: user.id,
    daily_log_id: dailyLog.id,
    food_id: foodId,
    quantity: grams / 100,
    meal,
  });

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
}

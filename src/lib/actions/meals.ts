"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveFoodId, type FoodSearchResult } from "@/lib/actions/food-search";
import type { Meal } from "@/lib/supabase/database.types";

export interface SavedMealItem {
  id: string; // meal_items.id
  foodId: string;
  name: string;
  quantity: number;
  servingSize: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SavedMeal {
  id: string;
  title: string;
  items: SavedMealItem[];
}

export async function getMyMeals(): Promise<{ meals?: SavedMeal[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("meals")
    .select("*, meal_items(*, food:foods(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  return {
    meals: (data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      items: (m.meal_items ?? [])
        .filter((mi) => mi.food)
        .map((mi) => ({
          id: mi.id,
          foodId: mi.food_id,
          name: mi.food!.name,
          quantity: Number(mi.quantity),
          servingSize: mi.food!.serving_size,
          calories: Number(mi.food!.calories),
          protein: Number(mi.food!.protein),
          carbs: Number(mi.food!.carbs),
          fat: Number(mi.food!.fat),
        })),
    })),
  };
}

export async function createMeal(
  title: string,
  items: { result: FoodSearchResult; quantity: number }[],
) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Give the meal a title");
  if (items.length === 0) throw new Error("Add at least one food");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({ user_id: user.id, title: trimmedTitle })
    .select("id")
    .single();

  if (mealError || !meal) throw new Error(mealError?.message ?? "Could not save meal");

  const rows = await Promise.all(
    items.map(async (item) => ({
      meal_id: meal.id,
      food_id: await resolveFoodId(supabase, user.id, item.result),
      quantity: item.quantity,
    })),
  );

  const { error: itemsError } = await supabase.from("meal_items").insert(rows);
  if (itemsError) throw new Error(itemsError.message);

  revalidatePath("/log");
}

// Adds a new item to an existing saved meal template (not a logged
// instance) — edit mode needs to be able to grow a meal, not just adjust
// or remove what's already there.
export async function addMealItem(mealId: string, result: FoodSearchResult, quantity: number) {
  if (!(quantity > 0)) throw new Error("Quantity must be greater than 0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Belt-and-suspenders ownership check alongside RLS: confirms the meal is
  // both real and this user's before resolving/inserting anything.
  const { data: meal } = await supabase
    .from("meals")
    .select("id")
    .eq("id", mealId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!meal) throw new Error("Meal not found");

  const foodId = await resolveFoodId(supabase, user.id, result);

  const { error } = await supabase.from("meal_items").insert({
    meal_id: mealId,
    food_id: foodId,
    quantity,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/log");
}

export async function updateMealTitle(mealId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title can't be empty");

  const supabase = await createClient();
  const { error } = await supabase.from("meals").update({ title: trimmed }).eq("id", mealId);
  if (error) throw new Error(error.message);

  revalidatePath("/log");
}

export async function deleteMeal(mealId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) throw new Error(error.message);

  revalidatePath("/log");
}

export async function updateMealItemQuantity(mealItemId: string, quantity: number) {
  if (!(quantity > 0)) throw new Error("Quantity must be greater than 0");

  const supabase = await createClient();
  const { error } = await supabase
    .from("meal_items")
    .update({ quantity })
    .eq("id", mealItemId);

  if (error) throw new Error(error.message);

  revalidatePath("/log");
}

export async function deleteMealItem(mealItemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_items").delete().eq("id", mealItemId);
  if (error) throw new Error(error.message);

  revalidatePath("/log");
}

// Logs one food_logs entry per item, all tagged with whatever meal category
// the user is currently logging into — quantities passed in may differ from
// the saved template (portions aren't always identical to the template).
export async function logSavedMeal(
  date: string,
  mealCategory: Meal,
  items: { foodId: string; quantity: number }[],
) {
  if (items.length === 0) throw new Error("Nothing to log");
  if (items.some((i) => !(i.quantity > 0))) throw new Error("Quantities must be greater than 0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: dailyLog, error: dailyLogError } = await supabase
    .from("daily_logs")
    .upsert({ user_id: user.id, date }, { onConflict: "user_id,date" })
    .select("id")
    .single();

  if (dailyLogError || !dailyLog) {
    throw new Error(dailyLogError?.message ?? "Could not create daily log");
  }

  const { error: logError } = await supabase.from("food_logs").insert(
    items.map((item) => ({
      user_id: user.id,
      daily_log_id: dailyLog.id,
      food_id: item.foodId,
      quantity: item.quantity,
      meal: mealCategory,
    })),
  );

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
  revalidatePath("/log");
}

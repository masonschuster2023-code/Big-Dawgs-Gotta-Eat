"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/lib/supabase/database.types";

export async function logManualFood(_prevState: unknown, formData: FormData) {
  const date = formData.get("date") as string;
  const meal = formData.get("meal") as Meal;
  const name = formData.get("name") as string;
  const calories = Number(formData.get("calories"));
  const protein = Number(formData.get("protein"));
  const carbs = Number(formData.get("carbs"));
  const fat = Number(formData.get("fat"));
  const servingSize = (formData.get("serving_size") as string) || null;
  const quantity = Number(formData.get("quantity")) || 1;

  if (!name || !date || !meal || [calories, protein, carbs, fat].some(Number.isNaN)) {
    return { error: "Please fill in all required fields." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: dailyLog, error: dailyLogError } = await supabase
    .from("daily_logs")
    .upsert({ user_id: user.id, date }, { onConflict: "user_id,date" })
    .select("id")
    .single();

  if (dailyLogError || !dailyLog) {
    return { error: dailyLogError?.message ?? "Could not create daily log." };
  }

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name,
      source: "manual",
      calories,
      protein,
      carbs,
      fat,
      serving_size: servingSize,
    })
    .select("id")
    .single();

  if (foodError || !food) {
    return { error: foodError?.message ?? "Could not save food." };
  }

  const { error: logError } = await supabase.from("food_logs").insert({
    user_id: user.id,
    daily_log_id: dailyLog.id,
    food_id: food.id,
    quantity,
    meal,
  });

  if (logError) {
    return { error: logError.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteFoodLog(foodLogId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("food_logs").delete().eq("id", foodLogId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateFoodLog(foodLogId: string, quantity: number, meal: Meal) {
  if (!(quantity > 0)) throw new Error("Quantity must be greater than 0");

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_logs")
    .update({ quantity, meal })
    .eq("id", foodLogId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

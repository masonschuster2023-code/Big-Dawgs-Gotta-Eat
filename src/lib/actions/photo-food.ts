"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzePhotoForFood, type PhotoFoodItem, type PhotoConfidence } from "@/lib/claude-vision";
import type { Meal } from "@/lib/supabase/database.types";

export async function analyzeFoodPhoto(
  base64: string,
  mediaType: string,
): Promise<{ items?: PhotoFoodItem[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return { error: "Unsupported image type." };
  }

  try {
    const items = await analyzePhotoForFood(
      base64,
      mediaType as "image/jpeg" | "image/png" | "image/webp",
    );

    if (items.length === 0) {
      return {
        error: "Couldn't identify any food in that photo. Try a clearer shot, or search manually below.",
      };
    }

    return { items };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Photo analysis failed." };
  }
}

export async function logPhotoFoodItem(
  date: string,
  meal: Meal,
  confidence: PhotoConfidence,
  name: string,
  macros: { calories: number; protein: number; carbs: number; fat: number },
  grams: number,
) {
  if (!(grams > 0)) throw new Error("Grams must be greater than 0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const source = confidence === "label" ? "photo_label" : "photo_estimate";

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name,
      source,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      serving_size: `${grams} g`,
    })
    .select("id")
    .single();

  if (foodError || !food) throw new Error(foodError?.message ?? "Could not save food");

  // A photo-read label is real OCR'd data, same trust level as a verified
  // USDA hit — cache it into the shared catalog so it benefits future
  // searches too. A visual estimate of a homemade/restaurant plate is a
  // one-off guess specific to this photo and portion, so it never leaves
  // this user's personal foods table.
  //
  // Known limitation: there's no natural dedup key for a photo capture (no
  // barcode, no fdc_id), so repeated label reads of the same product across
  // users will each insert their own row here rather than deduping like the
  // USDA-backed catalog entries do.
  if (source === "photo_label") {
    await supabase.from("food_catalog").insert({
      source: "photo_label",
      name,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      serving_size: grams,
      serving_unit: "g",
    });
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
    food_id: food.id,
    quantity: 1,
    meal,
  });

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
}

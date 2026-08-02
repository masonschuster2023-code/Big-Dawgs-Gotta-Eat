"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzePhotoForFood, type PhotoFoodItem, type PhotoConfidence } from "@/lib/claude-vision";
import { upsertFoodCatalogEntry } from "@/lib/actions/food-search";
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
  brand: string | null,
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
  // searches too, deduping against an existing entry by normalized
  // name+brand since there's no fdc_id to key off of (see
  // upsertFoodCatalogEntry). A visual estimate of a homemade/restaurant
  // plate is a one-off guess specific to this photo and portion, so it
  // never leaves this user's personal foods table.
  //
  // food_catalog rows are always per-100g by convention (true by
  // construction for USDA rows, which always store serving_size=100) — the
  // search UI's quantity math assumes this for every non-"recent" origin
  // regardless of what serving_size actually says. Scale the label's
  // as-printed serving up to per-100g before storing so a photo_label row
  // follows the same convention instead of quietly breaking it.
  if (source === "photo_label") {
    const scale = 100 / grams;
    await upsertFoodCatalogEntry(supabase, {
      source: "photo_label",
      name,
      brand,
      calories: macros.calories * scale,
      protein: macros.protein * scale,
      carbs: macros.carbs * scale,
      fat: macros.fat * scale,
      servingSize: 100,
      servingUnit: "g",
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

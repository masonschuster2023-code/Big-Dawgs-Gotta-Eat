"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lookupOpenFoodFacts } from "@/lib/off";
import type { Meal } from "@/lib/supabase/database.types";

export interface BarcodeLookupResult {
  found: boolean;
  isCorrection: boolean;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
  error?: string;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      found: false,
      isCorrection: false,
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: null,
      error: "Not authenticated",
    };
  }

  // A saved correction always wins over live Open Food Facts data — that's
  // the whole point of food_overrides.
  const { data: override } = await supabase
    .from("food_overrides")
    .select("*")
    .eq("user_id", user.id)
    .eq("barcode", barcode)
    .maybeSingle();

  const { data: cachedFood } = await supabase
    .from("foods")
    .select("name, serving_size")
    .eq("user_id", user.id)
    .eq("barcode", barcode)
    .maybeSingle();

  if (override) {
    return {
      found: true,
      isCorrection: true,
      name: cachedFood?.name ?? barcode,
      calories: Number(override.calories ?? 0),
      protein: Number(override.protein ?? 0),
      carbs: Number(override.carbs ?? 0),
      fat: Number(override.fat ?? 0),
      servingSize: cachedFood?.serving_size ?? null,
    };
  }

  try {
    const product = await lookupOpenFoodFacts(barcode);
    if (!product) {
      return {
        found: false,
        isCorrection: false,
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: null,
        error: "No product found for this barcode.",
      };
    }

    return { found: true, isCorrection: false, ...product };
  } catch (err) {
    return {
      found: false,
      isCorrection: false,
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: null,
      error: err instanceof Error ? err.message : "Lookup failed",
    };
  }
}

export async function logBarcodeFood(
  date: string,
  meal: Meal,
  barcode: string,
  name: string,
  macros: { calories: number; protein: number; carbs: number; fat: number },
  servingSize: string | null,
  grams: number,
  wasEdited: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only persist a correction if the user actually changed something —
  // food_overrides should hold corrections for bad data, not every OFF
  // snapshot we've ever fetched.
  if (wasEdited) {
    const { error } = await supabase.from("food_overrides").upsert(
      {
        user_id: user.id,
        barcode,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      },
      { onConflict: "user_id,barcode" },
    );
    if (error) throw new Error(error.message);
  }

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .upsert(
      {
        user_id: user.id,
        name,
        source: "open_food_facts",
        barcode,
        serving_size: servingSize,
        ...macros,
      },
      { onConflict: "user_id,barcode" },
    )
    .select("id")
    .single();

  if (foodError || !food) throw new Error(foodError?.message ?? "Could not save food");

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
    quantity: grams / 100,
    meal,
  });

  if (logError) throw new Error(logError.message);

  revalidatePath("/");
}

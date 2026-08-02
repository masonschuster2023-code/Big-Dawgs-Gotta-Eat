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
      .filter((f) => !seenFdcIds.has(f.fdc_id ?? undefined))
      .map((f) => ({
        origin: "catalog",
        fdcId: f.fdc_id ?? undefined,
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

// History tab: this user's own logging history, no search text required.
// Same shape/heuristic as tier 1 of searchFoodDatabase (ordered by when the
// food row was created, as a proxy for recency).
export async function getRecentFoods(): Promise<{ results?: FoodSearchResult[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };

  return {
    results: (data ?? []).map((f) => ({
      origin: "recent",
      personalFoodId: f.id,
      fdcId: f.fdc_id ?? undefined,
      name: f.name,
      servingSize: f.serving_size,
      calories: Number(f.calories),
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fat: Number(f.fat),
    })),
  };
}

// My Foods tab: foods this user created by hand via Quick add.
export async function getMyFoods(): Promise<{ results?: FoodSearchResult[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", "manual")
    .order("name", { ascending: true });

  if (error) return { error: error.message };

  return {
    results: (data ?? []).map((f) => ({
      origin: "recent",
      personalFoodId: f.id,
      name: f.name,
      servingSize: f.serving_size,
      calories: Number(f.calories),
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fat: Number(f.fat),
    })),
  };
}

// Resolves any FoodSearchResult to a row in the user's personal foods
// table, creating one if needed. This is the one true way anything in this
// app turns a search hit into something food_logs (or meal_items) can
// reference — food_logs.food_id is a plain FK to foods, no discriminator,
// so catalog/USDA hits always get resolved into a personal row before
// anything gets persisted. Reused by addSearchResultToLog and by the
// meals actions so meal_items follows the exact same pattern.
export async function resolveFoodId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  result: FoodSearchResult,
): Promise<string> {
  if (result.personalFoodId) return result.personalFoodId;

  if (!result.fdcId) throw new Error("Missing food reference");

  const { data: existing } = await supabase
    .from("foods")
    .select("id")
    .eq("user_id", userId)
    .eq("fdc_id", result.fdcId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .insert({
      user_id: userId,
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
  return food.id;
}

// Lowercase, trim, strip accents/punctuation, collapse whitespace. Used for
// exact-match catalog dedup, not fuzzy similarity — see upsertFoodCatalogEntry.
// Not exported: this is a "use server" file, and Next.js requires every
// export from one to be an async server action.
function normalizeForMatch(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (e.g. é -> e)
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CatalogEntryInput {
  source: "usda" | "photo_label";
  fdcId?: string | null;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

// The one place a food_catalog row gets created or reused. USDA hits have a
// real fdc_id, so that's a hard unique key — upsert on conflict, same as
// before. Photo-label hits have no fdc_id (a photo isn't a USDA record), so
// there's nothing to upsert against; instead this does an exact match on
// normalized name+brand and reuses that row if found. Deliberately not
// fuzzy/similarity-based — a false merge (e.g. "Chicken Breast" matching
// "Chicken Breast Tenders") silently attaches wrong macros to a food, which
// is worse than a duplicate catalog row.
export async function upsertFoodCatalogEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: CatalogEntryInput,
): Promise<string> {
  if (entry.fdcId) {
    const { data, error } = await supabase
      .from("food_catalog")
      .upsert(
        {
          fdc_id: entry.fdcId,
          name: entry.name,
          brand: entry.brand ?? null,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          serving_size: entry.servingSize,
          serving_unit: entry.servingUnit,
          source: entry.source,
        },
        { onConflict: "fdc_id" },
      )
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not save catalog entry");
    return data.id;
  }

  const normName = normalizeForMatch(entry.name);
  const normBrand = normalizeForMatch(entry.brand);

  if (normName) {
    // Narrow the candidate set with a cheap substring filter (indexable),
    // then compare normalized forms exactly in application code — the
    // actual match decision, not the filter, is what has to be strict.
    const firstWord = normName.split(" ")[0];
    const { data: candidates } = await supabase
      .from("food_catalog")
      .select("id, name, brand")
      .ilike("name", `%${firstWord}%`)
      .limit(50);

    const match = (candidates ?? []).find(
      (c) => normalizeForMatch(c.name) === normName && normalizeForMatch(c.brand) === normBrand,
    );

    if (match) return match.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("food_catalog")
    .insert({
      name: entry.name,
      brand: entry.brand ?? null,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      serving_size: entry.servingSize,
      serving_unit: entry.servingUnit,
      source: entry.source,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Could not save catalog entry");
  }
  return inserted.id;
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

  const foodId = await resolveFoodId(supabase, user.id, result);

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

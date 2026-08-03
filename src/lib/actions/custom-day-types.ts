"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CustomDayType {
  id: string;
  name: string;
  calorieOffset: number;
  proteinSkew: number;
  carbSkew: number;
  fatSkew: number;
}

export async function getCustomDayTypes(): Promise<{
  customDayTypes?: CustomDayType[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("custom_day_types")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  return {
    customDayTypes: (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      calorieOffset: Number(d.calorie_offset),
      proteinSkew: d.protein_skew,
      carbSkew: d.carb_skew,
      fatSkew: d.fat_skew,
    })),
  };
}

export async function createCustomDayType(input: {
  name: string;
  calorieOffset: number;
  proteinSkew: number;
  carbSkew: number;
  fatSkew: number;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the day type a name");
  if (input.proteinSkew + input.carbSkew + input.fatSkew !== 100) {
    throw new Error("Macro skew must add up to 100%");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("custom_day_types").insert({
    user_id: user.id,
    name,
    calorie_offset: input.calorieOffset,
    protein_skew: input.proteinSkew,
    carb_skew: input.carbSkew,
    fat_skew: input.fatSkew,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteCustomDayType(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_day_types").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function getDaySelections(date: string): Promise<{
  selectedIds?: string[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("custom_day_type_selections")
    .select("custom_day_type_id")
    .eq("user_id", user.id)
    .eq("date", date);

  if (error) return { error: error.message };

  return { selectedIds: (data ?? []).map((d) => d.custom_day_type_id) };
}

export async function getWeekSelections(
  startDate: string,
  endDate: string,
): Promise<{
  selectionsByDate?: Record<string, string[]>;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("custom_day_type_selections")
    .select("date, custom_day_type_id")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) return { error: error.message };

  const selectionsByDate: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (selectionsByDate[row.date] ??= []).push(row.custom_day_type_id);
  }
  return { selectionsByDate };
}

// Toggle: adds the selection if not present, removes it if present.
export async function toggleDaySelection(date: string, customDayTypeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("custom_day_type_selections")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .eq("custom_day_type_id", customDayTypeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("custom_day_type_selections")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("custom_day_type_selections").insert({
      user_id: user.id,
      date,
      custom_day_type_id: customDayTypeId,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

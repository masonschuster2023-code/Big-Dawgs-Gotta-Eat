"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CustomDayType {
  id: string;
  name: string;
  calorieOffset: number;
  proteinOffsetG: number;
  carbOffsetG: number;
  fatOffsetG: number;
  archived: boolean;
}

function fromRow(d: {
  id: string;
  name: string;
  calorie_offset: number;
  protein_offset_g: number;
  carb_offset_g: number;
  fat_offset_g: number;
  archived: boolean;
}): CustomDayType {
  return {
    id: d.id,
    name: d.name,
    calorieOffset: Number(d.calorie_offset),
    proteinOffsetG: Number(d.protein_offset_g),
    carbOffsetG: Number(d.carb_offset_g),
    fatOffsetG: Number(d.fat_offset_g),
    archived: d.archived,
  };
}

// By default returns only active (non-archived) day types — the set that
// should be offered for new selections. Pass includeArchived for the
// management screen, which also lists archived ones (with a restore
// option) rather than hiding them entirely.
export async function getCustomDayTypes(options?: {
  includeArchived?: boolean;
}): Promise<{
  customDayTypes?: CustomDayType[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let query = supabase.from("custom_day_types").select("*").eq("user_id", user.id);
  if (!options?.includeArchived) {
    query = query.eq("archived", false);
  }
  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) return { error: error.message };

  return { customDayTypes: (data ?? []).map(fromRow) };
}

export interface DayTypeInput {
  name: string;
  calorieOffset: number;
  proteinOffsetG: number;
  carbOffsetG: number;
  fatOffsetG: number;
}

function validate(input: DayTypeInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Give it a name.");
  if (
    !Number.isFinite(input.calorieOffset) ||
    !Number.isFinite(input.proteinOffsetG) ||
    !Number.isFinite(input.carbOffsetG) ||
    !Number.isFinite(input.fatOffsetG)
  ) {
    throw new Error("Offsets must be numbers.");
  }
  return name;
}

export async function createCustomDayType(input: DayTypeInput) {
  const name = validate(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("custom_day_types").insert({
    user_id: user.id,
    name,
    calorie_offset: input.calorieOffset,
    protein_offset_g: input.proteinOffsetG,
    carb_offset_g: input.carbOffsetG,
    fat_offset_g: input.fatOffsetG,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function updateCustomDayType(id: string, input: DayTypeInput) {
  const name = validate(input);

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_day_types")
    .update({
      name,
      calorie_offset: input.calorieOffset,
      protein_offset_g: input.proteinOffsetG,
      carb_offset_g: input.carbOffsetG,
      fat_offset_g: input.fatOffsetG,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

// Soft-delete: hides the type from future selection without touching any
// daily_log_selections rows that already reference it, so past days keep
// showing exactly what they showed before.
export async function archiveCustomDayType(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_day_types")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function restoreCustomDayType(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_day_types")
    .update({ archived: false })
    .eq("id", id);
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

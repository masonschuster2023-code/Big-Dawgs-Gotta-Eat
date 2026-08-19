"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTargets, type ProfileInputs, type ComputedTargets } from "@/lib/goals";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(): Promise<{ profile?: Profile | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  return { profile: data };
}

// manualTargets, when present, are stored as-is instead of the formula
// output, and targets_manual_override is set so a later profile-inputs edit
// (e.g. updating weight) doesn't silently recompute over them — the caller
// must explicitly switch back to Recalculate (omit manualTargets) to clear
// the flag and get formula-driven targets again.
export async function saveProfile(
  inputs: ProfileInputs,
  manualTargets?: ComputedTargets | null,
): Promise<{ error?: string }> {
  if (!(inputs.weightLb > 0) || !(inputs.heightIn > 0) || !(inputs.age > 0)) {
    return { error: "Weight, height, and age must be greater than 0." };
  }
  if (
    manualTargets &&
    (!(manualTargets.calories > 0) ||
      manualTargets.protein < 0 ||
      manualTargets.carbs < 0 ||
      manualTargets.fat < 0)
  ) {
    return { error: "Custom targets must be positive numbers." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const targets = manualTargets ?? computeTargets(inputs);

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      sex: inputs.sex,
      weight_lb: inputs.weightLb,
      height_in: inputs.heightIn,
      age: inputs.age,
      activity_level: inputs.activityLevel,
      goal: inputs.goal,
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
      targets_manual_override: Boolean(manualTargets),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  return {};
}

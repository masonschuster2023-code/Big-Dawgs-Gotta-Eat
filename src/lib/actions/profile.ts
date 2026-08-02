"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTargets, type ProfileInputs } from "@/lib/goals";
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

export async function saveProfile(inputs: ProfileInputs): Promise<{ error?: string }> {
  if (!(inputs.weightLb > 0) || !(inputs.heightIn > 0) || !(inputs.age > 0)) {
    return { error: "Weight, height, and age must be greater than 0." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Recalculated from scratch every save — the stored baseline always
  // reflects the current inputs, never the original onboarding numbers.
  const targets = computeTargets(inputs);

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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  return {};
}

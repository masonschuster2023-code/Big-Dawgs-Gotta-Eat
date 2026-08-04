"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayDate } from "@/lib/date";
import type { WeightLog } from "@/lib/weight";

const HISTORY_DAYS = 90;
// Extra lookback so the rolling average for the oldest displayed point is
// still computed from a full trailing window, not a truncated one.
const LOOKBACK_BUFFER_DAYS = 6;

export async function getWeightLogs(): Promise<{ logs?: WeightLog[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const startDate = addDays(todayDate(), -(HISTORY_DAYS + LOOKBACK_BUFFER_DAYS));

  const { data, error } = await supabase
    .from("weight_logs")
    .select("date, weight")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (error) return { error: error.message };

  return { logs: (data ?? []).map((d) => ({ date: d.date, weight: Number(d.weight) })) };
}

export async function upsertWeightLog(date: string, weight: number) {
  if (!(weight > 0)) throw new Error("Weight must be greater than 0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("weight_logs")
    .upsert({ user_id: user.id, date, weight }, { onConflict: "user_id,date" });

  if (error) throw new Error(error.message);

  revalidatePath("/weight");
}

export interface WeightPeriod {
  id: string;
  startDate: string;
  startWeight: number;
  endDate: string | null;
}

export async function getActivePeriod(): Promise<{ period?: WeightPeriod | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("weight_periods")
    .select("*")
    .eq("user_id", user.id)
    .is("end_date", null)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { period: null };

  return {
    period: {
      id: data.id,
      startDate: data.start_date,
      startWeight: Number(data.start_weight),
      endDate: data.end_date,
    },
  };
}

// Closes the current active period (if any) and opens a new one seeded
// from the most recently logged weight.
export async function startNewPeriod() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: latest, error: latestError } = await supabase
    .from("weight_logs")
    .select("weight")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);
  if (!latest) throw new Error("Log a weight entry before starting a new phase.");

  const today = todayDate();

  const { error: closeError } = await supabase
    .from("weight_periods")
    .update({ end_date: today })
    .eq("user_id", user.id)
    .is("end_date", null);

  if (closeError) throw new Error(closeError.message);

  const { error: insertError } = await supabase.from("weight_periods").insert({
    user_id: user.id,
    start_date: today,
    start_weight: Number(latest.weight),
  });

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/weight");
}

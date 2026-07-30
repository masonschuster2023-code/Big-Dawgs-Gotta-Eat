"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setDayType(date: string, dayTypeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("daily_logs")
    .upsert(
      { user_id: user.id, date, day_type_id: dayTypeId },
      { onConflict: "user_id,date" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function setGoingOut(date: string, goingOut: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("daily_logs")
    .upsert(
      { user_id: user.id, date, going_out_flag: goingOut },
      { onConflict: "user_id,date" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

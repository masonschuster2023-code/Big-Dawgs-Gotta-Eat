import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDate } from "@/lib/date";
import { DayTypePicker } from "@/components/DayTypePicker";
import { CalorieProgress } from "@/components/CalorieProgress";
import { MacroBreakdown } from "@/components/MacroBreakdown";
import { DiaryMealCard } from "@/components/DiaryMealCard";
import { Card } from "@/components/Card";
import { signOut } from "@/app/auth/actions";
import { getProfile } from "@/lib/actions/profile";
import type { Meal } from "@/lib/supabase/database.types";

const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const date = todayDate();

  const [{ data: dayTypes }, { data: dailyLog }, { profile }] = await Promise.all([
    supabase.from("day_types").select("*").order("calorie_min", { ascending: false }),
    supabase.from("daily_logs").select("*").eq("date", date).maybeSingle(),
    getProfile(),
  ]);

  const { data: foodLogs } = dailyLog
    ? await supabase
        .from("food_logs")
        .select("*, food:foods(*)")
        .eq("daily_log_id", dailyLog.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const entries = foodLogs ?? [];

  // Live-computed from food_logs on every render — same totals logic as
  // before, nothing cached, so there's no staleness to manage after edits.
  const totals = entries.reduce(
    (acc, entry) => {
      const food = entry.food;
      if (!food) return acc;
      const qty = Number(entry.quantity);
      acc.calories += Number(food.calories) * qty;
      acc.protein += Number(food.protein) * qty;
      acc.carbs += Number(food.carbs) * qty;
      acc.fat += Number(food.fat) * qty;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const entriesByMeal = MEAL_ORDER.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
          <div>
            <h1 className="text-xl font-bold">
              Big Dawgs Gotta <span className="text-tennessee">Eat</span>
            </h1>
            <p className="text-sm text-neutral-500">{date}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/week" className="text-sm font-medium text-tennessee hover:underline">
              This week →
            </Link>
            <Link href="/settings" className="text-sm font-medium text-tennessee hover:underline">
              Settings
            </Link>
            <span className="hidden text-sm text-neutral-500 sm:inline">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm font-medium text-neutral-500 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="space-y-5">
          <Card title="Day type">
            <DayTypePicker
              date={date}
              dayTypes={dayTypes ?? []}
              selectedDayTypeId={dailyLog?.day_type_id ?? null}
              goingOut={dailyLog?.going_out_flag ?? false}
            />
          </Card>

          <Card title="Today">
            {profile ? (
              <div className="space-y-5">
                <CalorieProgress consumed={totals.calories} goal={profile.calories} />
                <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <MacroBreakdown
                    targets={{ carbs: profile.carbs, fat: profile.fat, protein: profile.protein }}
                    totals={totals}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                <Link href="/settings" className="text-tennessee underline">
                  Set up your goals
                </Link>{" "}
                to see your targets.
              </p>
            )}
          </Card>

          <div>
            <h2 className="mb-2 px-1 text-sm font-medium text-neutral-500">Diary</h2>
            <div className="space-y-3">
              {entriesByMeal.map(({ meal, items }) => (
                <DiaryMealCard key={meal} meal={meal} label={MEAL_LABELS[meal]} entries={items} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

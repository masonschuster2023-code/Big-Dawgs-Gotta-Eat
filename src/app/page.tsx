import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDate } from "@/lib/date";
import { DayTypePicker } from "@/components/DayTypePicker";
import { CalorieProgress } from "@/components/CalorieProgress";
import { MacroBreakdown } from "@/components/MacroBreakdown";
import { DiaryMealCard } from "@/components/DiaryMealCard";
import { Card } from "@/components/Card";
import { TodayDayTypesCard } from "@/components/TodayDayTypesCard";
import { BottomTabBar } from "@/components/BottomTabBar";
import { getProfile } from "@/lib/actions/profile";
import { getCustomDayTypes, getDaySelections } from "@/lib/actions/custom-day-types";
import { applyDayTypeOffsets, type ComputedTargets } from "@/lib/goals";
import { isLegacyAccount } from "@/lib/legacy-account";
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

  const legacy = isLegacyAccount(user?.email);
  const date = todayDate();

  const [{ data: dayTypes }, { data: dailyLog }, { profile }, { customDayTypes }] =
    await Promise.all([
      supabase.from("day_types").select("*").order("calorie_min", { ascending: false }),
      supabase.from("daily_logs").select("*").eq("date", date).maybeSingle(),
      getProfile(),
      getCustomDayTypes(),
    ]);

  // The legacy day_types system (Mason's account only, see isLegacyAccount)
  // and the custom day types system (every other account) are mutually
  // exclusive — never both active for the same account.
  const hasCustomDayTypes = !legacy && (customDayTypes?.length ?? 0) > 0;
  const { selectedIds } = hasCustomDayTypes ? await getDaySelections(date) : { selectedIds: [] };
  const selectedSet = new Set(selectedIds ?? []);

  // Legacy targets come directly from the selected day_type row's own
  // fixed values — restored to the exact pre-onboarding behavior, since
  // that's what "the display updates when you pick a different day type"
  // means for this account.
  const selectedDayType = legacy
    ? ((dayTypes ?? []).find((dt) => dt.id === dailyLog?.day_type_id) ?? null)
    : null;
  const legacyTargets: ComputedTargets | null = selectedDayType
    ? {
        calories: selectedDayType.calorie_max,
        protein: selectedDayType.protein_g,
        carbs: selectedDayType.carb_max,
        fat: selectedDayType.fat_g,
      }
    : null;

  // `profile` here is whatever's stored in calories/protein/carbs/fat,
  // whether that came from the Mifflin-St Jeor recalculation or from a
  // manual override (see targets_manual_override) — day-type offsets
  // always layer on top of it either way. Deliberate: day types exist to
  // adjust for a day's activity independent of how the baseline itself
  // was set, not to be suppressed by manual override.
  const displayTargets = legacy
    ? legacyTargets
    : profile && hasCustomDayTypes
      ? applyDayTypeOffsets(
          profile,
          (customDayTypes ?? [])
            .filter((d) => selectedSet.has(d.id))
            .map((d) => ({
              calorieOffset: d.calorieOffset,
              proteinOffsetG: d.proteinOffsetG,
              carbOffsetG: d.carbOffsetG,
              fatOffsetG: d.fatOffsetG,
            })),
        )
      : profile;

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
    <div className="min-h-screen pb-28">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between px-1">
          <div>
            <h1 className="text-xl font-bold">
              Big Dawgs Gotta <span className="text-tennessee">Eat</span>
            </h1>
            <p className="text-sm text-neutral-500">{date}</p>
          </div>
          <span className="hidden text-sm text-neutral-500 sm:inline">{user?.email}</span>
        </header>

        <div className="space-y-6">
          {legacy && (
            <Card title="Day type">
              <DayTypePicker
                date={date}
                dayTypes={dayTypes ?? []}
                selectedDayTypeId={dailyLog?.day_type_id ?? null}
                goingOut={dailyLog?.going_out_flag ?? false}
              />
            </Card>
          )}

          {hasCustomDayTypes && (
            <Card title="Today's day types">
              <TodayDayTypesCard
                date={date}
                customDayTypes={customDayTypes ?? []}
                initialSelectedIds={selectedIds ?? []}
              />
            </Card>
          )}

          <Card title="Today">
            {displayTargets ? (
              <div className="space-y-6">
                <CalorieProgress consumed={totals.calories} goal={displayTargets.calories} />
                <MacroBreakdown
                  targets={{
                    carbs: displayTargets.carbs,
                    fat: displayTargets.fat,
                    protein: displayTargets.protein,
                  }}
                  totals={totals}
                />
              </div>
            ) : legacy ? (
              <p className="text-sm text-neutral-400">Pick a day type above to see your targets.</p>
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
            <h2 className="mb-3 px-1 text-sm font-medium text-neutral-500">Diary</h2>
            <div className="space-y-4">
              {entriesByMeal.map(({ meal, items }) => (
                <DiaryMealCard key={meal} meal={meal} label={MEAL_LABELS[meal]} entries={items} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}

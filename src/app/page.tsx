import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDate } from "@/lib/date";
import { DayTypePicker } from "@/components/DayTypePicker";
import { MacroTotals } from "@/components/MacroTotals";
import { FoodEntryForm } from "@/components/FoodEntryForm";
import { FoodDatabaseSearch } from "@/components/FoodDatabaseSearch";
import { BarcodeScan } from "@/components/BarcodeScan";
import { DeleteFoodLogButton } from "@/components/DeleteFoodLogButton";
import { Card } from "@/components/Card";
import { signOut } from "@/app/auth/actions";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<(typeof MEAL_ORDER)[number], string> = {
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

  const [{ data: dayTypes }, { data: dailyLog }] = await Promise.all([
    supabase.from("day_types").select("*").order("calorie_min", { ascending: false }),
    supabase
      .from("daily_logs")
      .select("*, day_type:day_types(*)")
      .eq("date", date)
      .maybeSingle(),
  ]);

  const { data: foodLogs } = dailyLog
    ? await supabase
        .from("food_logs")
        .select("*, food:foods(*)")
        .eq("daily_log_id", dailyLog.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const entries = foodLogs ?? [];

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
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/home-bg.jpg)" }}
      />
      <div className="fixed inset-0 -z-10 bg-zinc-50/55 dark:bg-black/55" />

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

          <Card title="Today's totals">
            <MacroTotals dayType={dailyLog?.day_type ?? null} totals={totals} />
          </Card>

          <Card title="Today's food">
            <div className="space-y-4">
              {entriesByMeal.map(({ meal, items }) => (
                <div key={meal}>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                    {MEAL_LABELS[meal]}
                  </h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-neutral-400">Nothing logged yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {items.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-neutral-800"
                        >
                          <span>
                            {entry.food?.name}
                            {Number(entry.quantity) !== 1 ? ` ×${entry.quantity}` : ""}
                            <span className="ml-2 text-neutral-400">
                              {Math.round(Number(entry.food?.calories ?? 0) * Number(entry.quantity))}{" "}
                              cal
                            </span>
                          </span>
                          <DeleteFoodLogButton foodLogId={entry.id} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Scan barcode">
            <BarcodeScan date={date} />
          </Card>

          <Card title="Search food database">
            <FoodDatabaseSearch date={date} />
          </Card>

          <Card title="Add food manually">
            <FoodEntryForm date={date} />
          </Card>
        </div>
      </div>
    </div>
  );
}

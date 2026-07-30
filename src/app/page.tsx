import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDate } from "@/lib/date";
import { DayTypePicker } from "@/components/DayTypePicker";
import { MacroTotals } from "@/components/MacroTotals";
import { FoodEntryForm } from "@/components/FoodEntryForm";
import { FoodDatabaseSearch } from "@/components/FoodDatabaseSearch";
import { BarcodeScan } from "@/components/BarcodeScan";
import { DeleteFoodLogButton } from "@/components/DeleteFoodLogButton";
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Big Dawgs Gotta Eat</h1>
            <p className="text-sm text-neutral-500">{date}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/week" className="text-sm font-medium underline">
              This week →
            </Link>
            <span className="text-sm text-neutral-500">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm font-medium underline">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="space-y-6">
          <DayTypePicker
            date={date}
            dayTypes={dayTypes ?? []}
            selectedDayTypeId={dailyLog?.day_type_id ?? null}
            goingOut={dailyLog?.going_out_flag ?? false}
          />

          <MacroTotals dayType={dailyLog?.day_type ?? null} totals={totals} />

          <div>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Today&apos;s food</h2>
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
                          className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm shadow-sm dark:bg-neutral-900"
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
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Scan barcode</h2>
            <BarcodeScan date={date} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Search food database</h2>
            <FoodDatabaseSearch date={date} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Add food manually</h2>
            <FoodEntryForm date={date} />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { todayDate } from "@/lib/date";
import { FoodLoggingScreen } from "@/components/FoodLoggingScreen";
import type { Meal } from "@/lib/supabase/database.types";

const VALID_MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function isMeal(value: string | undefined): value is Meal {
  return VALID_MEALS.includes(value as Meal);
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string }>;
}) {
  const params = await searchParams;
  const meal: Meal = isMeal(params.meal) ? params.meal : "breakfast";
  const date = todayDate();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
          <div>
            <h1 className="text-xl font-bold">Log {MEAL_LABELS[meal]}</h1>
            <p className="text-sm text-neutral-500">{date}</p>
          </div>
          <Link href="/" className="text-sm font-medium text-tennessee hover:underline">
            ← Today
          </Link>
        </header>

        <FoodLoggingScreen date={date} meal={meal} />
      </div>
    </div>
  );
}

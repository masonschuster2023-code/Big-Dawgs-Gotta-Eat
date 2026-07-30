import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDate, getWeekStart, addDays } from "@/lib/date";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const emptyMacros = (): Macros => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

export default async function WeekPage() {
  const supabase = await createClient();
  const today = todayDate();
  const weekStart = getWeekStart(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDates[6];

  const { data: dailyLogs } = await supabase
    .from("daily_logs")
    .select("*, day_type:day_types(*)")
    .gte("date", weekStart)
    .lte("date", weekEnd);

  const logsByDate = new Map((dailyLogs ?? []).map((log) => [log.date, log]));
  const dailyLogIds = (dailyLogs ?? []).map((log) => log.id);

  const { data: foodLogs } = dailyLogIds.length
    ? await supabase.from("food_logs").select("*, food:foods(*)").in("daily_log_id", dailyLogIds)
    : { data: [] };

  const totalsByDailyLogId = new Map<string, Macros>();
  for (const entry of foodLogs ?? []) {
    const food = entry.food;
    if (!food) continue;
    const qty = Number(entry.quantity);
    const totals = totalsByDailyLogId.get(entry.daily_log_id) ?? emptyMacros();
    totals.calories += Number(food.calories) * qty;
    totals.protein += Number(food.protein) * qty;
    totals.carbs += Number(food.carbs) * qty;
    totals.fat += Number(food.fat) * qty;
    totalsByDailyLogId.set(entry.daily_log_id, totals);
  }

  const days = weekDates.map((date, i) => {
    const log = logsByDate.get(date);
    const actual = log ? (totalsByDailyLogId.get(log.id) ?? emptyMacros()) : emptyMacros();
    return {
      date,
      label: DAY_LABELS[i],
      isFuture: date > today,
      dayType: log?.day_type ?? null,
      goingOut: log?.going_out_flag ?? false,
      actual,
    };
  });

  // Only days with a day type assigned (and not in the future) count toward
  // the weekly average — a day nobody categorized yet has no target to
  // average against.
  const countedDays = days.filter((d) => d.dayType && !d.isFuture);
  const goingOutCount = days.filter((d) => d.goingOut && !d.isFuture).length;

  const avg = (fn: (d: (typeof days)[number]) => number) =>
    countedDays.length ? countedDays.reduce((sum, d) => sum + fn(d), 0) / countedDays.length : 0;

  const avgActual: Macros = {
    calories: avg((d) => d.actual.calories),
    protein: avg((d) => d.actual.protein),
    carbs: avg((d) => d.actual.carbs),
    fat: avg((d) => d.actual.fat),
  };

  const avgTarget = {
    calorieMid: avg((d) => (d.dayType!.calorie_min + d.dayType!.calorie_max) / 2),
    protein: avg((d) => d.dayType!.protein_g),
    carbMid: avg((d) => (d.dayType!.carb_min + d.dayType!.carb_max) / 2),
    fat: avg((d) => d.dayType!.fat_g),
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">This week</h1>
            <p className="text-sm text-neutral-500">
              {weekStart} – {weekEnd}
            </p>
          </div>
          <Link href="/" className="text-sm font-medium underline">
            ← Today
          </Link>
        </header>

        <div className="space-y-6">
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Calories</th>
                  <th className="px-3 py-2 font-medium">P / C / F</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr
                    key={d.date}
                    className={`border-b border-neutral-100 last:border-0 dark:border-neutral-900 ${
                      d.isFuture ? "opacity-40" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{d.label}</div>
                      <div className="text-xs text-neutral-400">{d.date}</div>
                    </td>
                    <td className="px-3 py-2">{d.dayType?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {Math.round(d.actual.calories)}
                      {d.dayType && (
                        <span className="text-neutral-400">
                          {" "}
                          / {d.dayType.calorie_min}–{d.dayType.calorie_max}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {Math.round(d.actual.protein)}g / {Math.round(d.actual.carbs)}g /{" "}
                      {Math.round(d.actual.fat)}g
                    </td>
                    <td className="px-3 py-2">
                      {d.goingOut && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Going out
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-3 text-sm font-medium text-neutral-500">
              Weekly average ({countedDays.length} day{countedDays.length === 1 ? "" : "s"} counted)
            </h2>

            {countedDays.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No days with a day type set yet this week — pick a day type on the daily log to see
                averages here.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Calories</span>
                  <span>
                    {Math.round(avgActual.calories)} avg vs {Math.round(avgTarget.calorieMid)}{" "}
                    target
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Protein</span>
                  <span>
                    {Math.round(avgActual.protein)}g avg vs {Math.round(avgTarget.protein)}g target
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Carbs</span>
                  <span>
                    {Math.round(avgActual.carbs)}g avg vs {Math.round(avgTarget.carbMid)}g target
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fat</span>
                  <span>
                    {Math.round(avgActual.fat)}g avg vs {Math.round(avgTarget.fat)}g target
                  </span>
                </div>
              </div>
            )}

            {goingOutCount > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                {`${goingOutCount} going-out night${goingOutCount === 1 ? "" : "s"} this week — they aren't expected to hit the daily target, the plan already builds in room for them at the weekly level.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

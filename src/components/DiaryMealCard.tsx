import Link from "next/link";
import { EditableFoodLogItem } from "@/components/EditableFoodLogItem";
import type { Meal } from "@/lib/supabase/database.types";

interface DiaryEntry {
  id: string;
  quantity: number | string;
  meal: Meal;
  food: { name: string; calories: number | string } | null;
}

export function DiaryMealCard({
  meal,
  label,
  entries,
}: {
  meal: Meal;
  label: string;
  entries: DiaryEntry[];
}) {
  const subtotal = entries.reduce(
    (sum, e) => sum + Number(e.food?.calories ?? 0) * Number(e.quantity),
    0,
  );

  return (
    <div className="rounded-[24px] bg-neutral-50/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_16px_-10px_rgba(0,0,0,0.1)] dark:bg-neutral-900/50">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-sm text-neutral-500">{Math.round(subtotal)} cal</span>
      </div>

      {entries.length === 0 ? (
        <p className="mb-3 text-sm text-neutral-400">Nothing logged yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {entries.map((entry) => (
            <EditableFoodLogItem
              key={entry.id}
              id={entry.id}
              name={entry.food?.name ?? "Unknown food"}
              quantity={Number(entry.quantity)}
              meal={entry.meal}
              calories={Number(entry.food?.calories ?? 0) * Number(entry.quantity)}
            />
          ))}
        </ul>
      )}

      <Link
        href={`/log?meal=${meal}`}
        className="inline-block rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark"
      >
        Log {label}
      </Link>
    </div>
  );
}

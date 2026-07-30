"use client";

import { useTransition } from "react";
import { setDayType, setGoingOut } from "@/lib/actions/daily-log";
import type { Database } from "@/lib/supabase/database.types";

type DayType = Database["public"]["Tables"]["day_types"]["Row"];

export function DayTypePicker({
  date,
  dayTypes,
  selectedDayTypeId,
  goingOut,
}: {
  date: string;
  dayTypes: DayType[];
  selectedDayTypeId: string | null;
  goingOut: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Day type</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dayTypes.map((dt) => {
            const selected = dt.id === selectedDayTypeId;
            return (
              <button
                key={dt.id}
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => setDayType(date, dt.id))}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700"
                }`}
              >
                {dt.name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={goingOut}
          disabled={isPending}
          onChange={(e) => startTransition(() => setGoingOut(date, e.target.checked))}
          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
        />
        Going out tonight
      </label>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toggleDaySelection } from "@/lib/actions/custom-day-types";
import type { CustomDayType } from "@/lib/actions/custom-day-types";

export function TodayDayTypesCard({
  date,
  customDayTypes,
  initialSelectedIds,
}: {
  date: string;
  customDayTypes: CustomDayType[];
  initialSelectedIds: string[];
}) {
  const [selected, setSelected] = useState(new Set(initialSelectedIds));
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    const wasSelected = selected.has(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (wasSelected) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(async () => {
      try {
        await toggleDaySelection(date, id);
      } catch {
        // Revert on failure.
        setSelected((prev) => {
          const next = new Set(prev);
          if (wasSelected) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {customDayTypes.map((d) => {
        const isSelected = selected.has(d.id);
        return (
          <button
            key={d.id}
            type="button"
            disabled={isPending}
            onClick={() => toggle(d.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isSelected
                ? "border-tennessee bg-tennessee text-white"
                : "border-neutral-300 hover:border-tennessee/60 dark:border-neutral-700"
            }`}
          >
            {d.name}{" "}
            <span className={isSelected ? "text-white/80" : "text-neutral-400"}>
              ({d.calorieOffset >= 0 ? "+" : ""}
              {d.calorieOffset})
            </span>
          </button>
        );
      })}
      {selected.size === 0 && (
        <p className="text-xs text-neutral-400">Nothing selected — plain baseline today.</p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateFoodLog, deleteFoodLog } from "@/lib/actions/food";
import type { Meal } from "@/lib/supabase/database.types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function EditableFoodLogItem({
  id,
  name,
  quantity,
  meal,
  calories,
}: {
  id: string;
  name: string;
  quantity: number;
  meal: Meal;
  calories: number;
}) {
  const [editing, setEditing] = useState(false);
  const [quantityInput, setQuantityInput] = useState(String(quantity));
  const [mealInput, setMealInput] = useState<Meal>(meal);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <li className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => {
            setQuantityInput(String(quantity));
            setMealInput(meal);
            setEditing(true);
          }}
          className="flex-1 text-left"
        >
          {name}
          {quantity !== 1 ? ` ×${quantity}` : ""}
          <span className="ml-2 text-neutral-400">{Math.round(calories)} cal</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteFoodLog(id))}
          className="ml-2 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
        >
          Remove
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-neutral-800">
      <p className="font-medium">{name}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="any"
          min={0.01}
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="Quantity"
        />
        <select
          value={mealInput}
          onChange={(e) => setMealInput(e.target.value as Meal)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
        >
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {m[0].toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending || !(Number(quantityInput) > 0)}
          onClick={() =>
            startTransition(async () => {
              await updateFoodLog(id, Number(quantityInput), mealInput);
              setEditing(false);
            })
          }
          className="rounded-md bg-tennessee px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-neutral-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { logManualFood } from "@/lib/actions/food";
import type { Meal } from "@/lib/supabase/database.types";

export function FoodEntryForm({
  date,
  meal,
  onAdded,
}: {
  date: string;
  meal: Meal;
  onAdded?: () => void;
}) {
  const [state, formAction, pending] = useActionState(logManualFood, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onAdded?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <label className="block text-xs font-medium text-neutral-500">Food name</label>
          <input
            name="name"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Calories</label>
          <input
            name="calories"
            type="number"
            step="any"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Protein (g)</label>
          <input
            name="protein"
            type="number"
            step="any"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Carbs (g)</label>
          <input
            name="carbs"
            type="number"
            step="any"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Fat (g)</label>
          <input
            name="fat"
            type="number"
            step="any"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Quantity</label>
          <input
            name="quantity"
            type="number"
            step="any"
            defaultValue={1}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-2 sm:col-span-3">
          <label className="block text-xs font-medium text-neutral-500">
            Serving size (optional)
          </label>
          <input
            name="serving_size"
            type="text"
            placeholder="e.g. 1 cup"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add food"}
      </button>
    </form>
  );
}

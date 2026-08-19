"use client";

import { useState } from "react";
import type { ComputedMacros } from "@/lib/units";

export interface ManualFoodDraft {
  name: string;
  macros: ComputedMacros;
  servingSize: string | null;
}

export function FoodEntryForm({ onContinue }: { onContinue: (draft: ManualFoodDraft) => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cals = Number(calories);
    const p = Number(protein);
    const c = Number(carbs);
    const f = Number(fat);
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    if ([cals, p, c, f].some(Number.isNaN)) {
      setError("Calories, protein, carbs, and fat must all be numbers.");
      return;
    }
    setError(null);
    onContinue({
      name: name.trim(),
      macros: { calories: cals, protein: p, carbs: c, fat: f },
      servingSize: servingSize.trim() || null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <label className="block text-xs font-medium text-neutral-500">Food name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Calories</label>
          <input
            type="number"
            step="any"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Protein (g)</label>
          <input
            type="number"
            step="any"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Carbs (g)</label>
          <input
            type="number"
            step="any"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500">Fat (g)</label>
          <input
            type="number"
            step="any"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-2 sm:col-span-4">
          <label className="block text-xs font-medium text-neutral-500">
            Serving size (optional — e.g. &quot;1 cup&quot; or &quot;100 g&quot;)
          </label>
          <input
            type="text"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            placeholder="e.g. 1 cup"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        className="rounded-lg bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark"
      >
        Continue
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  unitOptionsFor,
  macrosForUnit,
  effectiveQuantity,
  type FoodReference,
  type ComputedMacros,
  type UnitOption,
} from "@/lib/units";
import { NutritionRing, MacroColumns } from "@/components/NutritionRing";
import type { Meal } from "@/lib/supabase/database.types";

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};
const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

function VerifiedBadge() {
  return (
    <span
      title="From your history or the shared catalog"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-tennessee text-white"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export interface LogPayload {
  meal: Meal;
  effectiveQuantity: number;
  totalGrams: number | null;
  macros: ComputedMacros;
}

export function AddFoodDetail({
  name,
  verified,
  reference,
  initialMeal,
  onBack,
  onLog,
  isLogging,
  error,
}: {
  name: string;
  verified: boolean;
  reference: FoodReference;
  initialMeal: Meal;
  onBack: () => void;
  onLog: (payload: LogPayload) => void;
  isLogging?: boolean;
  error?: string | null;
}) {
  const unitOptions = reference.referenceGrams !== null ? unitOptionsFor(name) : [];
  // Default to the "g" unit with servings = the food's own reference
  // grams, so the initial total on screen matches exactly what the food
  // already represented before any unit/serving interaction — e.g. a
  // 100g-basis catalog food starts at "1 g" x 100 servings = 100g, same
  // total as before this screen existed.
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(
    unitOptions.find((u) => u.id === "g") ?? unitOptions[0] ?? null,
  );
  const [servings, setServings] = useState(
    reference.referenceGrams !== null ? String(reference.referenceGrams) : "1",
  );
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [sheetOpen, setSheetOpen] = useState(false);

  const servingsNum = Number(servings) || 0;
  const unitGrams = selectedUnit?.grams ?? null;
  const macros = macrosForUnit(reference, unitGrams ?? 0, servingsNum);

  const unitLabel = selectedUnit?.label ?? reference.nativeUnitLabel;

  const submit = () => {
    if (!(servingsNum > 0)) return;
    onLog({
      meal,
      effectiveQuantity: effectiveQuantity(reference, unitGrams ?? 0, servingsNum),
      totalGrams: unitGrams !== null ? unitGrams * servingsNum : null,
      macros,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M15 19 8 12l7-7"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Add Food</h1>
        <button
          type="button"
          onClick={submit}
          disabled={isLogging || !(servingsNum > 0)}
          className="text-sm font-semibold text-tennessee disabled:opacity-40"
        >
          {isLogging ? "Logging…" : "Log"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{name}</h2>
        {verified && <VerifiedBadge />}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => unitOptions.length > 0 && setSheetOpen(true)}
          disabled={unitOptions.length === 0}
          className="flex w-full items-center justify-between rounded-xl bg-neutral-50/80 px-4 py-3 text-left dark:bg-neutral-800/40"
        >
          <span className="text-sm font-medium">Serving Size</span>
          <span className="flex items-center gap-1 text-sm text-neutral-500">
            {unitLabel}
            {unitOptions.length > 0 && (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="m9 6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        <div className="flex items-center justify-between rounded-xl bg-neutral-50/80 px-4 py-3 dark:bg-neutral-800/40">
          <label className="text-sm font-medium" htmlFor="servings-input">
            Number of Servings
          </label>
          <input
            id="servings-input"
            type="number"
            step="any"
            min={0}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-right text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="rounded-xl bg-neutral-50/80 px-4 py-3 dark:bg-neutral-800/40">
          <p className="mb-2 text-sm font-medium">Meal</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeal(m)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  meal === m
                    ? "bg-tennessee text-white"
                    : "bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] bg-neutral-50/80 p-6 dark:bg-neutral-900/50">
        <NutritionRing
          calories={macros.calories}
          protein={macros.protein}
          carbs={macros.carbs}
          fat={macros.fat}
        />
        <div className="mt-5">
          <MacroColumns
            calories={macros.calories}
            protein={macros.protein}
            carbs={macros.carbs}
            fat={macros.fat}
          />
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-t-[28px] bg-white p-5 pb-8 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-semibold">Select Unit</p>
            <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
              {unitOptions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      // Reset to 1 serving of the newly-picked unit —
                      // carrying over the old count (e.g. "100" from a
                      // 100g default) would silently imply something like
                      // "100 eggs" the moment the unit changes.
                      setServings("1");
                      setSelectedUnit(u);
                      setSheetOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    {u.label}
                    {selectedUnit?.id === u.id && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-tennessee">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  logSavedMeal,
  updateMealTitle,
  updateMealItemQuantity,
  deleteMealItem,
  deleteMeal,
  type SavedMeal,
} from "@/lib/actions/meals";
import type { Meal } from "@/lib/supabase/database.types";

type Mode = "collapsed" | "log" | "edit";

export function SavedMealItem({
  meal: savedMeal,
  date,
  mealCategory,
  onChanged,
}: {
  meal: SavedMeal;
  date: string;
  mealCategory: Meal;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<Mode>("collapsed");
  const [logQuantities, setLogQuantities] = useState<Record<string, number>>({});
  const [editTitle, setEditTitle] = useState(savedMeal.title);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalCalories = savedMeal.items.reduce((sum, i) => sum + i.calories * i.quantity, 0);

  const openLog = () => {
    setLogQuantities(Object.fromEntries(savedMeal.items.map((i) => [i.id, i.quantity])));
    setError(null);
    setMode("log");
  };

  const openEdit = () => {
    setEditTitle(savedMeal.title);
    setEditQuantities(Object.fromEntries(savedMeal.items.map((i) => [i.id, i.quantity])));
    setError(null);
    setMode("edit");
  };

  const submitLog = () => {
    setError(null);
    startTransition(async () => {
      try {
        await logSavedMeal(
          date,
          mealCategory,
          savedMeal.items.map((i) => ({
            foodId: i.foodId,
            quantity: logQuantities[i.id] ?? i.quantity,
          })),
        );
        setMode("collapsed");
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not log meal");
      }
    });
  };

  const saveTitle = () => {
    startTransition(async () => {
      await updateMealTitle(savedMeal.id, editTitle);
      onChanged();
    });
  };

  const saveItemQuantity = (itemId: string) => {
    startTransition(async () => {
      await updateMealItemQuantity(itemId, editQuantities[itemId]);
      onChanged();
    });
  };

  const removeItem = (itemId: string) => {
    startTransition(async () => {
      await deleteMealItem(itemId);
      onChanged();
    });
  };

  const removeMeal = () => {
    startTransition(async () => {
      await deleteMeal(savedMeal.id);
      onChanged();
    });
  };

  if (mode === "collapsed") {
    return (
      <li className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium">{savedMeal.title}</p>
            <p className="text-xs text-neutral-400">
              {savedMeal.items.length} item{savedMeal.items.length === 1 ? "" : "s"} ·{" "}
              {Math.round(totalCalories)} cal
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={openLog}
              className="rounded-md bg-tennessee px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark"
            >
              Log
            </button>
            <button
              type="button"
              onClick={openEdit}
              className="text-xs text-neutral-500 hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
      </li>
    );
  }

  if (mode === "log") {
    return (
      <li className="space-y-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <p className="font-medium">{savedMeal.title}</p>
        <ul className="space-y-1">
          {savedMeal.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className="flex-1">{item.name}</span>
              <input
                type="number"
                step="any"
                min={0.01}
                value={logQuantities[item.id] ?? item.quantity}
                onChange={(e) =>
                  setLogQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))
                }
                className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                aria-label={`Quantity for ${item.name}`}
              />
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={submitLog}
            className="rounded-md bg-tennessee px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
          >
            {isPending ? "Logging…" : "Log this meal"}
          </button>
          <button
            type="button"
            onClick={() => setMode("collapsed")}
            className="text-xs text-neutral-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  // edit mode
  return (
    <li className="space-y-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div className="flex gap-2">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={saveTitle}
          className="rounded-md bg-tennessee px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          Save title
        </button>
      </div>

      <ul className="space-y-1">
        {savedMeal.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2">
            <span className="flex-1">{item.name}</span>
            <input
              type="number"
              step="any"
              min={0.01}
              value={editQuantities[item.id] ?? item.quantity}
              onChange={(e) =>
                setEditQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))
              }
              className="w-16 rounded-md border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
              aria-label={`Quantity for ${item.name}`}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => saveItemQuantity(item.id)}
              className="text-xs text-tennessee hover:underline"
            >
              Save
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => removeItem(item.id)}
              className="text-xs text-neutral-400 hover:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={removeMeal}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Delete meal
        </button>
        <button
          type="button"
          onClick={() => setMode("collapsed")}
          className="text-xs text-neutral-500 hover:underline"
        >
          Done
        </button>
      </div>
    </li>
  );
}

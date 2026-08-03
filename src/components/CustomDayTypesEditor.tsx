"use client";

import { useState, useTransition } from "react";
import {
  createCustomDayType,
  deleteCustomDayType,
  type CustomDayType,
} from "@/lib/actions/custom-day-types";

export function CustomDayTypesEditor({ initial }: { initial: CustomDayType[] }) {
  const [dayTypes, setDayTypes] = useState(initial);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [calorieOffset, setCalorieOffset] = useState("300");
  const [carbSkew, setCarbSkew] = useState(100);
  const [proteinSkew, setProteinSkew] = useState(0);
  const [fatSkew, setFatSkew] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const skewTotal = carbSkew + proteinSkew + fatSkew;

  const resetForm = () => {
    setName("");
    setCalorieOffset("300");
    setCarbSkew(100);
    setProteinSkew(0);
    setFatSkew(0);
    setError(null);
    setIsAdding(false);
  };

  const add = () => {
    const trimmed = name.trim();
    const offset = Number(calorieOffset);
    if (!trimmed) {
      setError("Give it a name.");
      return;
    }
    if (!Number.isFinite(offset)) {
      setError("Calorie offset must be a number.");
      return;
    }
    if (skewTotal !== 100) {
      setError("Macro skew must add up to 100%.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCustomDayType({
          name: trimmed,
          calorieOffset: offset,
          proteinSkew,
          carbSkew,
          fatSkew,
        });
        setDayTypes((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: trimmed,
            calorieOffset: offset,
            proteinSkew,
            carbSkew,
            fatSkew,
          },
        ]);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteCustomDayType(id);
      setDayTypes((prev) => prev.filter((d) => d.id !== id));
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Any activities you often do (lifting, sports, combo days, etc.) should be an option, so
        your calories adjust to match your day&apos;s effort.
      </p>

      {dayTypes.length > 0 && (
        <ul className="space-y-2">
          {dayTypes.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            >
              <div>
                <span className="font-medium">{d.name}</span>{" "}
                <span className="text-neutral-500">
                  {d.calorieOffset >= 0 ? "+" : ""}
                  {d.calorieOffset} cal
                </span>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => remove(d.id)}
                className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div>
            <label className="block text-xs font-medium text-neutral-500">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lift, Baseball, Long run"
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">
              Calorie offset (+/-)
            </label>
            <input
              type="number"
              step="any"
              value={calorieOffset}
              onChange={(e) => setCalorieOffset(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">
              Macro skew for those extra calories (must total 100%)
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-400">Carb %</label>
                <input
                  type="number"
                  value={carbSkew}
                  onChange={(e) => setCarbSkew(Number(e.target.value) || 0)}
                  className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400">Protein %</label>
                <input
                  type="number"
                  value={proteinSkew}
                  onChange={(e) => setProteinSkew(Number(e.target.value) || 0)}
                  className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400">Fat %</label>
                <input
                  type="number"
                  value={fatSkew}
                  onChange={(e) => setFatSkew(Number(e.target.value) || 0)}
                  className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
            </div>
            <p className={`mt-1 text-xs ${skewTotal === 100 ? "text-neutral-400" : "text-red-600"}`}>
              Total: {skewTotal}%
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={add}
              className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add day type"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-neutral-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
        >
          + Add a day type
        </button>
      )}
    </div>
  );
}

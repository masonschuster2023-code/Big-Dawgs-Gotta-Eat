"use client";

import { useState, useTransition } from "react";
import {
  searchFoodDatabase,
  addSearchResultToLog,
  type FoodSearchResult,
} from "@/lib/actions/food-search";
import type { Meal } from "@/lib/supabase/database.types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

const ORIGIN_LABEL: Record<FoodSearchResult["origin"], string> = {
  recent: "Recently logged",
  catalog: "From catalog",
  usda: "From USDA",
};

function ResultRow({ date, result }: { date: string; result: FoodSearchResult }) {
  // "recent" results carry whatever serving they were originally defined
  // against — quantity is a generic multiplier, not necessarily grams.
  // "catalog"/"usda" results are always per-100g, so grams is the natural unit.
  const isPer100g = result.origin !== "recent";

  const [amount, setAmount] = useState(isPer100g ? 100 : 1);
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const factor = isPer100g ? amount / 100 : amount;

  return (
    <li className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {result.brand ? `${result.brand} — ${result.name}` : result.name}
          </p>
          <p className="text-xs text-neutral-400">{ORIGIN_LABEL[result.origin]}</p>
          <p className="text-xs text-neutral-500">
            {isPer100g ? "per 100g" : `per ${result.servingSize ?? "serving"}`} —{" "}
            {Math.round(result.calories)} cal · P{Math.round(result.protein)}g · C
            {Math.round(result.carbs)}g · F{Math.round(result.fat)}g
          </p>
          <p className="text-xs text-neutral-400">
            at {amount}
            {isPer100g ? "g" : "×"} — {Math.round(result.calories * factor)} cal · P
            {Math.round(result.protein * factor)}g · C{Math.round(result.carbs * factor)}g · F
            {Math.round(result.fat * factor)}g
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={amount}
          min={isPer100g ? 1 : 0.01}
          step="any"
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          aria-label={isPer100g ? "Grams" : "Quantity"}
        />
        {isPer100g && <span className="text-xs text-neutral-500">g</span>}

        <select
          value={meal}
          onChange={(e) => setMeal(e.target.value as Meal)}
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
          disabled={isPending || factor <= 0}
          onClick={() =>
            startTransition(async () => {
              await addSearchResultToLog(date, meal, result, factor);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            })
          }
          className="rounded-md bg-tennessee px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isPending ? "Adding…" : added ? "Added ✓" : "Add"}
        </button>
      </div>
    </li>
  );
}

export function FoodDatabaseSearch({ date }: { date: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, startSearch] = useTransition();

  const runSearch = () => {
    setError(null);
    startSearch(async () => {
      const res = await searchFoodDatabase(query);
      if (res.error) setError(res.error);
      setResults(res.results ?? []);
      setHasSearched(true);
    });
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search whole foods (e.g. chicken breast, banana)"
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((result, i) => (
            <ResultRow key={result.personalFoodId ?? result.fdcId ?? i} date={date} result={result} />
          ))}
        </ul>
      )}

      {!isSearching && !error && hasSearched && results.length === 0 && (
        <p className="text-sm text-neutral-400">No results found.</p>
      )}
    </div>
  );
}

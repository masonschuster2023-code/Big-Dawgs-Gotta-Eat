"use client";

import { useState, useTransition } from "react";
import { searchFoodDatabase, addSearchedFood } from "@/lib/actions/food-search";
import type { FdcSearchResult } from "@/lib/fdc";
import type { Meal } from "@/lib/supabase/database.types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

function ResultRow({ date, result }: { date: string; result: FdcSearchResult }) {
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const factor = grams / 100;

  return (
    <li className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{result.description}</p>
          <p className="text-xs text-neutral-500">
            per 100g — {Math.round(result.calories)} cal · P{Math.round(result.protein)}g · C
            {Math.round(result.carbs)}g · F{Math.round(result.fat)}g
          </p>
          <p className="text-xs text-neutral-400">
            at {grams}g — {Math.round(result.calories * factor)} cal · P
            {Math.round(result.protein * factor)}g · C{Math.round(result.carbs * factor)}g · F
            {Math.round(result.fat * factor)}g
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={grams}
          min={1}
          step="any"
          onChange={(e) => setGrams(Number(e.target.value) || 0)}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="Grams"
        />
        <span className="text-xs text-neutral-500">g</span>

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
          disabled={isPending || grams <= 0}
          onClick={() =>
            startTransition(async () => {
              await addSearchedFood(date, meal, result.fdcId, result.description, grams);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            })
          }
          className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Adding…" : added ? "Added ✓" : "Add"}
        </button>
      </div>
    </li>
  );
}

export function FoodDatabaseSearch({ date }: { date: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FdcSearchResult[]>([]);
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
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
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
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((result) => (
            <ResultRow key={result.fdcId} date={date} result={result} />
          ))}
        </ul>
      )}

      {!isSearching && !error && hasSearched && results.length === 0 && (
        <p className="text-sm text-neutral-400">No results found.</p>
      )}
    </div>
  );
}

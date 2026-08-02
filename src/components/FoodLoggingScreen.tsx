"use client";

import { useEffect, useState, useTransition } from "react";
import {
  searchFoodDatabase,
  getRecentFoods,
  getMyFoods,
  type FoodSearchResult,
} from "@/lib/actions/food-search";
import { getMyMeals, type SavedMeal } from "@/lib/actions/meals";
import { FoodResultRow } from "@/components/FoodResultRow";
import { BarcodeScan } from "@/components/BarcodeScan";
import { PhotoFoodLog } from "@/components/PhotoFoodLog";
import { FoodEntryForm } from "@/components/FoodEntryForm";
import { MealBuilder } from "@/components/MealBuilder";
import { SavedMealItem } from "@/components/SavedMealItem";
import type { Meal } from "@/lib/supabase/database.types";

type Tab = "history" | "my-meals" | "my-foods";
type Action = "barcode" | "photo" | "quickadd" | null;

const TAB_LABEL: Record<Tab, string> = {
  history: "History",
  "my-meals": "My Meals",
  "my-foods": "My Foods",
};

function actionButtonClass(active: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-tennessee text-white"
      : "border border-neutral-300 text-neutral-700 hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
  }`;
}

export function FoodLoggingScreen({ date, meal }: { date: string; meal: Meal }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  const [tab, setTab] = useState<Tab>("history");
  const [action, setAction] = useState<Action>(null);

  const [recent, setRecent] = useState<FoodSearchResult[] | null>(null);
  const [myFoods, setMyFoods] = useState<FoodSearchResult[] | null>(null);
  const [myMeals, setMyMeals] = useState<SavedMeal[] | null>(null);
  const [isBuildingMeal, setIsBuildingMeal] = useState(false);
  const [isLoadingTab, startLoadTab] = useTransition();

  const loadRecent = () => startLoadTab(async () => setRecent((await getRecentFoods()).results ?? []));
  const loadMyFoods = () => startLoadTab(async () => setMyFoods((await getMyFoods()).results ?? []));
  const loadMyMeals = () => startLoadTab(async () => setMyMeals((await getMyMeals()).meals ?? []));

  useEffect(() => {
    loadRecent();
  }, []);

  useEffect(() => {
    if (tab === "my-foods" && myFoods === null) loadMyFoods();
    if (tab === "my-meals" && myMeals === null) loadMyMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const runSearch = () => {
    setSearchError(null);
    startSearch(async () => {
      const res = await searchFoodDatabase(query);
      if (res.error) setSearchError(res.error);
      setSearchResults(res.results ?? []);
    });
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
    setSearchError(null);
  };

  // Keep History fresh after logging something new from any entry point.
  const handleAdded = () => loadRecent();

  const showingSearch = searchResults !== null;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) runSearch();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (!value.trim()) clearSearch();
          }}
          placeholder="Search foods…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-md bg-tennessee px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>

      {!showingSearch && (
        <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium ${
                tab === t
                  ? "border-b-2 border-tennessee text-tennessee"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAction(action === "barcode" ? null : "barcode")}
          className={actionButtonClass(action === "barcode")}
        >
          Barcode scan
        </button>
        <button
          type="button"
          onClick={() => setAction(action === "photo" ? null : "photo")}
          className={actionButtonClass(action === "photo")}
        >
          Meal scan
        </button>
        <button
          type="button"
          onClick={() => setAction(action === "quickadd" ? null : "quickadd")}
          className={actionButtonClass(action === "quickadd")}
        >
          Quick add
        </button>
      </div>

      {action === "barcode" && <BarcodeScan date={date} meal={meal} onAdded={handleAdded} />}
      {action === "photo" && <PhotoFoodLog date={date} meal={meal} onAdded={handleAdded} />}
      {action === "quickadd" && <FoodEntryForm date={date} meal={meal} onAdded={handleAdded} />}

      {showingSearch ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={clearSearch}
            className="text-xs text-neutral-500 hover:underline"
          >
            ← Back to {TAB_LABEL[tab]}
          </button>

          {searchError && <p className="text-sm text-red-600">{searchError}</p>}

          {!searchError && searchResults!.length === 0 && (
            <p className="text-sm text-neutral-400">No results found.</p>
          )}

          {searchResults!.length > 0 && (
            <ul className="space-y-2">
              {searchResults!.map((r, i) => (
                <FoodResultRow
                  key={r.personalFoodId ?? r.fdcId ?? i}
                  date={date}
                  meal={meal}
                  result={r}
                  onAdded={handleAdded}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          {tab === "history" &&
            (isLoadingTab && recent === null ? (
              <p className="text-sm text-neutral-400">Loading…</p>
            ) : (recent ?? []).length === 0 ? (
              <p className="text-sm text-neutral-400">
                Nothing logged yet — foods you log will show up here for quick re-logging.
              </p>
            ) : (
              <ul className="space-y-2">
                {(recent ?? []).map((r) => (
                  <FoodResultRow
                    key={r.personalFoodId}
                    date={date}
                    meal={meal}
                    result={r}
                    onAdded={handleAdded}
                  />
                ))}
              </ul>
            ))}

          {tab === "my-meals" &&
            (isBuildingMeal ? (
              <MealBuilder
                onSaved={() => {
                  setIsBuildingMeal(false);
                  loadMyMeals();
                }}
                onCancel={() => setIsBuildingMeal(false)}
              />
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsBuildingMeal(true)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
                >
                  + New meal
                </button>

                {isLoadingTab && myMeals === null ? (
                  <p className="text-sm text-neutral-400">Loading…</p>
                ) : (myMeals ?? []).length === 0 ? (
                  <p className="text-sm text-neutral-400">
                    No saved meals yet. Build one from foods you use often to log it as a single
                    unit next time.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(myMeals ?? []).map((m) => (
                      <SavedMealItem
                        key={m.id}
                        meal={m}
                        date={date}
                        mealCategory={meal}
                        onChanged={loadMyMeals}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}

          {tab === "my-foods" &&
            (isLoadingTab && myFoods === null ? (
              <p className="text-sm text-neutral-400">Loading…</p>
            ) : (myFoods ?? []).length === 0 ? (
              <p className="text-sm text-neutral-400">
                No foods added yet — use Quick add above to create one.
              </p>
            ) : (
              <ul className="space-y-2">
                {(myFoods ?? []).map((r) => (
                  <FoodResultRow
                    key={r.personalFoodId}
                    date={date}
                    meal={meal}
                    result={r}
                    onAdded={handleAdded}
                  />
                ))}
              </ul>
            ))}
        </div>
      )}
    </div>
  );
}

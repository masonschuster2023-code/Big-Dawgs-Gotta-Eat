"use client";

import { useEffect, useState, useTransition } from "react";
import {
  searchFoodDatabase,
  getRecentFoods,
  getMyFoods,
  addSearchResultToLog,
  type FoodSearchResult,
} from "@/lib/actions/food-search";
import { logBarcodeFood } from "@/lib/actions/barcode";
import { logPhotoFoodItem } from "@/lib/actions/photo-food";
import { logManualFood } from "@/lib/actions/food";
import { getMyMeals, type SavedMeal } from "@/lib/actions/meals";
import { FoodResultRow } from "@/components/FoodResultRow";
import { BarcodeScan, type BarcodeConfirmed } from "@/components/BarcodeScan";
import { PhotoFoodLog, type PhotoItemConfirmed } from "@/components/PhotoFoodLog";
import { FoodEntryForm, type ManualFoodDraft } from "@/components/FoodEntryForm";
import { MealBuilder } from "@/components/MealBuilder";
import { SavedMealItem } from "@/components/SavedMealItem";
import { AddFoodDetail, type LogPayload } from "@/components/AddFoodDetail";
import { parseGramsServing, type FoodReference } from "@/lib/units";
import type { Meal } from "@/lib/supabase/database.types";

type Tab = "history" | "my-meals" | "my-foods";
type Action = "barcode" | "photo" | "quickadd" | null;

const TAB_LABEL: Record<Tab, string> = {
  history: "History",
  "my-meals": "My Meals",
  "my-foods": "My Foods",
};

type PendingItem =
  | { kind: "search"; result: FoodSearchResult }
  | { kind: "barcode"; confirmed: BarcodeConfirmed }
  | { kind: "photo"; confirmed: PhotoItemConfirmed }
  | { kind: "manual"; draft: ManualFoodDraft };

function detailFor(item: PendingItem): { name: string; verified: boolean; reference: FoodReference } {
  switch (item.kind) {
    case "search":
      return {
        name: item.result.name,
        // Personal history and shared catalog are confirmed data; a live
        // USDA pull that hasn't been saved/confirmed into the catalog yet
        // isn't.
        verified: item.result.origin !== "usda",
        reference: {
          referenceGrams: parseGramsServing(item.result.servingSize),
          referenceMacros: {
            calories: item.result.calories,
            protein: item.result.protein,
            carbs: item.result.carbs,
            fat: item.result.fat,
          },
          nativeUnitLabel: item.result.servingSize ?? "1 serving",
        },
      };
    case "barcode":
      return {
        name: item.confirmed.name,
        // A fresh Open Food Facts lookup, not part of the three-tier
        // search's personal-history/catalog tiers — never verified.
        verified: false,
        reference: {
          referenceGrams: 100,
          referenceMacros: item.confirmed.macros,
          nativeUnitLabel: "100 g",
          // The bug this exists to fix: without this, every barcode item
          // defaults to a bare 100g slice of the per-100g data regardless
          // of what the product's real serving actually is.
          defaultTotalGrams: item.confirmed.servingQuantityG ?? undefined,
        },
      };
    case "photo":
      return {
        name: item.confirmed.name,
        verified: false,
        reference: {
          referenceGrams: item.confirmed.grams,
          referenceMacros: item.confirmed.macros,
          nativeUnitLabel: `${item.confirmed.grams} g`,
        },
      };
    case "manual":
      return {
        name: item.draft.name,
        verified: false,
        reference: {
          referenceGrams: parseGramsServing(item.draft.servingSize),
          referenceMacros: item.draft.macros,
          nativeUnitLabel: item.draft.servingSize ?? "1 serving",
        },
      };
  }
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

  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [isLogging, startLogging] = useTransition();

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
  const handleLogged = () => {
    loadRecent();
    setPendingItem(null);
  };

  const logPending = (payload: LogPayload) => {
    if (!pendingItem) return;
    setLogError(null);
    startLogging(async () => {
      try {
        switch (pendingItem.kind) {
          case "search":
            await addSearchResultToLog(date, payload.meal, pendingItem.result, payload.effectiveQuantity);
            break;
          case "barcode":
            await logBarcodeFood(
              date,
              payload.meal,
              pendingItem.confirmed.barcode,
              pendingItem.confirmed.name,
              pendingItem.confirmed.macros,
              pendingItem.confirmed.servingSize,
              payload.totalGrams ?? 100,
              pendingItem.confirmed.wasEdited,
            );
            break;
          case "photo":
            await logPhotoFoodItem(
              date,
              payload.meal,
              pendingItem.confirmed.confidence,
              pendingItem.confirmed.name,
              pendingItem.confirmed.brand,
              payload.macros,
              payload.totalGrams ?? pendingItem.confirmed.grams,
            );
            break;
          case "manual": {
            const formData = new FormData();
            formData.set("date", date);
            formData.set("meal", payload.meal);
            formData.set("name", pendingItem.draft.name);
            formData.set("calories", String(pendingItem.draft.macros.calories));
            formData.set("protein", String(pendingItem.draft.macros.protein));
            formData.set("carbs", String(pendingItem.draft.macros.carbs));
            formData.set("fat", String(pendingItem.draft.macros.fat));
            formData.set("serving_size", pendingItem.draft.servingSize ?? "");
            formData.set("quantity", String(payload.effectiveQuantity));
            const result = await logManualFood(undefined, formData);
            if (result?.error) throw new Error(result.error);
            break;
          }
        }
        handleLogged();
      } catch (err) {
        setLogError(err instanceof Error ? err.message : "Could not log this food");
      }
    });
  };

  if (pendingItem) {
    const { name, verified, reference } = detailFor(pendingItem);
    return (
      <AddFoodDetail
        name={name}
        verified={verified}
        reference={reference}
        initialMeal={meal}
        onBack={() => {
          setPendingItem(null);
          setLogError(null);
        }}
        onLog={logPending}
        isLogging={isLogging}
        error={logError}
      />
    );
  }

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
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            action === "barcode"
              ? "bg-tennessee text-white"
              : "border border-neutral-300 text-neutral-700 hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Barcode scan
        </button>
        <button
          type="button"
          onClick={() => setAction(action === "photo" ? null : "photo")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            action === "photo"
              ? "bg-tennessee text-white"
              : "border border-neutral-300 text-neutral-700 hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Meal scan
        </button>
        <button
          type="button"
          onClick={() => setAction(action === "quickadd" ? null : "quickadd")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            action === "quickadd"
              ? "bg-tennessee text-white"
              : "border border-neutral-300 text-neutral-700 hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Quick add
        </button>
      </div>

      {action === "barcode" && (
        <BarcodeScan onConfirmed={(confirmed) => setPendingItem({ kind: "barcode", confirmed })} />
      )}
      {action === "photo" && (
        <PhotoFoodLog onConfirmed={(confirmed) => setPendingItem({ kind: "photo", confirmed })} />
      )}
      {action === "quickadd" && (
        <FoodEntryForm onContinue={(draft) => setPendingItem({ kind: "manual", draft })} />
      )}

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
                  result={r}
                  onSelect={(result) => setPendingItem({ kind: "search", result })}
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
                    result={r}
                    onSelect={(result) => setPendingItem({ kind: "search", result })}
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
                    result={r}
                    onSelect={(result) => setPendingItem({ kind: "search", result })}
                  />
                ))}
              </ul>
            ))}
        </div>
      )}
    </div>
  );
}

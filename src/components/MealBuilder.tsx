"use client";

import { useState, useTransition } from "react";
import { searchFoodDatabase, type FoodSearchResult } from "@/lib/actions/food-search";
import { createMeal } from "@/lib/actions/meals";

interface DraftItem {
  result: FoodSearchResult;
  quantity: number;
}

export function MealBuilder({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const runSearch = () => {
    setSearchError(null);
    startSearch(async () => {
      const res = await searchFoodDatabase(query);
      if (res.error) setSearchError(res.error);
      setResults(res.results ?? []);
    });
  };

  const addToDraft = (result: FoodSearchResult) => {
    setDraft((prev) => [...prev, { result, quantity: result.origin === "recent" ? 1 : 100 }]);
  };

  const updateDraftQuantity = (index: number, quantity: number) => {
    setDraft((prev) => prev.map((d, i) => (i === index ? { ...d, quantity } : d)));
  };

  const removeDraftItem = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    if (!title.trim()) {
      setSaveError("Give the meal a title.");
      return;
    }
    if (draft.length === 0) {
      setSaveError("Add at least one food.");
      return;
    }
    setSaveError(null);
    startSaving(async () => {
      try {
        await createMeal(
          title.trim(),
          draft.map((d) => ({
            result: d.result,
            quantity: d.result.origin === "recent" ? d.quantity : d.quantity / 100,
          })),
        );
        onSaved();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save meal");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-2xl bg-neutral-50/80 p-4 dark:bg-neutral-800/40">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Meal title (e.g. My usual breakfast)"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      {draft.length > 0 && (
        <ul className="space-y-1">
          {draft.map((d, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-md bg-zinc-100 px-2 py-1.5 text-sm dark:bg-neutral-800"
            >
              <span className="flex-1">
                {d.result.brand ? `${d.result.brand} — ${d.result.name}` : d.result.name}
              </span>
              <input
                type="number"
                step="any"
                min={0.01}
                value={d.quantity}
                onChange={(e) => updateDraftQuantity(i, Number(e.target.value) || 0)}
                className="w-16 rounded-md border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                aria-label={d.result.origin === "recent" ? "Quantity" : "Grams"}
              />
              {d.result.origin !== "recent" && <span className="text-xs text-neutral-500">g</span>}
              <button
                type="button"
                onClick={() => removeDraftItem(i)}
                className="text-xs text-neutral-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods to add…"
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

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r, i) => (
            <li
              key={r.personalFoodId ?? r.fdcId ?? i}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-2 py-1.5 text-sm dark:bg-neutral-900/40"
            >
              <div>
                <p>{r.brand ? `${r.brand} — ${r.name}` : r.name}</p>
                <p className="text-xs text-neutral-400">
                  {Math.round(r.calories)} cal · P{Math.round(r.protein)}g · C{Math.round(r.carbs)}g
                  · F{Math.round(r.fat)}g {r.origin === "recent" ? `per ${r.servingSize ?? "serving"}` : "per 100g"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addToDraft(r)}
                className="rounded-md bg-tennessee px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={save}
          className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save meal"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-neutral-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

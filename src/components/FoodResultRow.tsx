"use client";

import type { FoodSearchResult } from "@/lib/actions/food-search";

const ORIGIN_LABEL: Record<FoodSearchResult["origin"], string> = {
  recent: "Recently logged",
  catalog: "From catalog",
  usda: "From USDA",
};

export function FoodResultRow({
  result,
  onSelect,
}: {
  result: FoodSearchResult;
  onSelect: (result: FoodSearchResult) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(result)}
        className="w-full rounded-2xl bg-neutral-50/80 p-4 text-left text-sm transition-colors hover:bg-neutral-100 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70"
      >
        <p className="font-medium">
          {result.brand ? `${result.brand} — ${result.name}` : result.name}
        </p>
        <p className="text-xs text-neutral-400">{ORIGIN_LABEL[result.origin]}</p>
        <p className="text-xs text-neutral-500">
          {result.servingSize ?? "1 serving"} — {Math.round(result.calories)} cal · P
          {Math.round(result.protein)}g · C{Math.round(result.carbs)}g · F{Math.round(result.fat)}g
        </p>
      </button>
    </li>
  );
}

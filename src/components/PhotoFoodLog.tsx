"use client";

import { useRef, useState, useTransition } from "react";
import { analyzeFoodPhoto, logPhotoFoodItem } from "@/lib/actions/photo-food";
import type { PhotoFoodItem } from "@/lib/claude-vision";
import type { Meal } from "@/lib/supabase/database.types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

// Downscaling before upload controls both cost and latency — image tokens
// cost more than text tokens, and a full-resolution phone photo is overkill
// for this task.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(blob);
  });

  return { base64, mediaType: "image/jpeg" };
}

function ItemRow({ date, item }: { date: string; item: PhotoFoodItem }) {
  const [name, setName] = useState(item.name);
  const [grams, setGrams] = useState(item.grams);
  const [macros, setMacros] = useState({
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
  });
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="space-y-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          item.confidence === "label"
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        }`}
      >
        {item.confidence === "label" ? "Read from label" : "Estimated from photo"}
      </span>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Grams</label>
          <input
            type="number"
            step="any"
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Calories</label>
          <input
            type="number"
            step="any"
            value={macros.calories}
            onChange={(e) => setMacros({ ...macros, calories: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Protein</label>
          <input
            type="number"
            step="any"
            value={macros.protein}
            onChange={(e) => setMacros({ ...macros, protein: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Carbs</label>
          <input
            type="number"
            step="any"
            value={macros.carbs}
            onChange={(e) => setMacros({ ...macros, carbs: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Fat</label>
          <input
            type="number"
            step="any"
            value={macros.fat}
            onChange={(e) => setMacros({ ...macros, fat: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          disabled={isPending || !name.trim() || grams <= 0}
          onClick={() =>
            startTransition(async () => {
              await logPhotoFoodItem(date, meal, item.confidence, name.trim(), macros, grams);
              setAdded(true);
            })
          }
          className="rounded-md bg-tennessee px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isPending ? "Adding…" : added ? "Added ✓" : "Add to log"}
        </button>
      </div>
    </li>
  );
}

export function PhotoFoodLog({ date }: { date: string }) {
  const [items, setItems] = useState<PhotoFoodItem[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    setItems(null);
    setPreview(URL.createObjectURL(file));

    startAnalyzing(async () => {
      try {
        const { base64, mediaType } = await compressImage(file);
        const result = await analyzeFoodPhoto(base64, mediaType);
        if (result.error) {
          setError(result.error);
        } else {
          setItems(result.items ?? []);
        }
      } catch {
        setError("Couldn't process that photo. Try a different one, or search manually below.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing photo…" : "Take or upload a photo"}
        </button>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected food" className="h-14 w-14 rounded-md object-cover" />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <ItemRow key={i} date={date} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

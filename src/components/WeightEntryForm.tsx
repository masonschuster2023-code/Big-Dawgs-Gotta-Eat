"use client";

import { useState, useTransition } from "react";
import { upsertWeightLog } from "@/lib/actions/weight";
import { todayDate } from "@/lib/date";

export function WeightEntryForm({ latestWeight }: { latestWeight: number | null }) {
  const [date, setDate] = useState(todayDate());
  const [weight, setWeight] = useState(latestWeight?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const weightNum = Number(weight);
    setSaved(false);
    if (!(weightNum > 0)) {
      setError("Enter a weight greater than 0.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await upsertWeightLog(date, weightNum);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Weight (lb)</label>
          <input
            type="number"
            step="any"
            min={1}
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-tennessee">Saved.</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="w-full rounded-md bg-tennessee px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Log weight"}
      </button>
    </div>
  );
}

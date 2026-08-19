"use client";

import { useState, useTransition } from "react";
import {
  createCustomDayType,
  updateCustomDayType,
  archiveCustomDayType,
  restoreCustomDayType,
  type CustomDayType,
  type DayTypeInput,
} from "@/lib/actions/custom-day-types";
import { macroCalorieMismatch } from "@/lib/goals";

const emptyForm = (): DayTypeInput => ({
  name: "",
  calorieOffset: 300,
  proteinOffsetG: 0,
  carbOffsetG: 75,
  fatOffsetG: 0,
});

function DayTypeForm({
  initial,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initial: DayTypeInput;
  onCancel: () => void;
  onSubmit: (input: DayTypeInput) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mismatch = macroCalorieMismatch({
    calories: form.calorieOffset,
    protein: form.proteinOffsetG,
    carbs: form.carbOffsetG,
    fat: form.fatOffsetG,
  });
  const mismatchWarning =
    Math.abs(mismatch) > 50
      ? `Macro offsets add up to about ${mismatch > 0 ? "+" : ""}${Math.round(mismatch)} cal ${mismatch > 0 ? "more" : "less"} than the calorie offset. That's fine if it's intentional.`
      : null;

  const submit = () => {
    if (!form.name.trim()) {
      setError("Give it a name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(form);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div>
        <label className="block text-xs font-medium text-neutral-500">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Lift, Baseball, Long run"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="block text-[11px] text-neutral-400">Calories (+/-)</label>
          <input
            type="number"
            step="any"
            value={form.calorieOffset}
            onChange={(e) =>
              setForm((f) => ({ ...f, calorieOffset: Number(e.target.value) || 0 }))
            }
            className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-400">Protein g (+/-)</label>
          <input
            type="number"
            step="any"
            value={form.proteinOffsetG}
            onChange={(e) =>
              setForm((f) => ({ ...f, proteinOffsetG: Number(e.target.value) || 0 }))
            }
            className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-400">Carbs g (+/-)</label>
          <input
            type="number"
            step="any"
            value={form.carbOffsetG}
            onChange={(e) => setForm((f) => ({ ...f, carbOffsetG: Number(e.target.value) || 0 }))}
            className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-400">Fat g (+/-)</label>
          <input
            type="number"
            step="any"
            value={form.fatOffsetG}
            onChange={(e) => setForm((f) => ({ ...f, fatOffsetG: Number(e.target.value) || 0 }))}
            className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      {mismatchWarning && <p className="text-xs text-amber-600 dark:text-amber-500">{mismatchWarning}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-neutral-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function offsetSummary(d: CustomDayType) {
  const parts = [`${d.calorieOffset >= 0 ? "+" : ""}${d.calorieOffset} cal`];
  if (d.proteinOffsetG) parts.push(`${d.proteinOffsetG >= 0 ? "+" : ""}${d.proteinOffsetG}p`);
  if (d.carbOffsetG) parts.push(`${d.carbOffsetG >= 0 ? "+" : ""}${d.carbOffsetG}c`);
  if (d.fatOffsetG) parts.push(`${d.fatOffsetG >= 0 ? "+" : ""}${d.fatOffsetG}f`);
  return parts.join(" / ");
}

export function CustomDayTypesEditor({ initial }: { initial: CustomDayType[] }) {
  const [dayTypes, setDayTypes] = useState(initial);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = dayTypes.filter((d) => !d.archived);
  const archived = dayTypes.filter((d) => d.archived);

  const add = async (input: DayTypeInput) => {
    await createCustomDayType(input);
    setDayTypes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), archived: false, ...input },
    ]);
    setIsAdding(false);
  };

  const edit = async (id: string, input: DayTypeInput) => {
    await updateCustomDayType(id, input);
    setDayTypes((prev) => prev.map((d) => (d.id === id ? { ...d, ...input } : d)));
    setEditingId(null);
  };

  const archive = (id: string) => {
    startTransition(async () => {
      await archiveCustomDayType(id);
      setDayTypes((prev) => prev.map((d) => (d.id === id ? { ...d, archived: true } : d)));
    });
  };

  const restore = (id: string) => {
    startTransition(async () => {
      await restoreCustomDayType(id);
      setDayTypes((prev) => prev.map((d) => (d.id === id ? { ...d, archived: false } : d)));
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Any activities you often do (lifting, sports, combo days, etc.) should be an option, so
        your calories adjust to match your day&apos;s effort.
      </p>

      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((d) =>
            editingId === d.id ? (
              <li key={d.id}>
                <DayTypeForm
                  initial={d}
                  submitLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(input) => edit(d.id, input)}
                />
              </li>
            ) : (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
              >
                <div>
                  <span className="font-medium">{d.name}</span>{" "}
                  <span className="text-neutral-500">{offsetSummary(d)}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setEditingId(d.id)}
                    className="text-xs text-neutral-400 hover:text-tennessee disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => archive(d.id)}
                    className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {isAdding ? (
        <DayTypeForm
          initial={emptyForm()}
          submitLabel="Add day type"
          onCancel={() => setIsAdding(false)}
          onSubmit={add}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-tennessee/60 dark:border-neutral-700 dark:text-neutral-300"
        >
          + Add a day type
        </button>
      )}

      {archived.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-xs font-medium text-neutral-400">
            Deleted day types ({archived.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {archived.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm opacity-60 dark:border-neutral-800"
              >
                <div>
                  <span className="font-medium">{d.name}</span>{" "}
                  <span className="text-neutral-500">{offsetSummary(d)}</span>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => restore(d.id)}
                  className="text-xs text-neutral-400 hover:text-tennessee disabled:opacity-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

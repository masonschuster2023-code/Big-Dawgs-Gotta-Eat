"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/actions/profile";
import {
  computeTargets,
  macroCalorieMismatch,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type Sex,
  type ActivityLevel,
  type Goal,
  type ComputedTargets,
} from "@/lib/goals";
import type { Profile } from "@/lib/actions/profile";

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
];
const GOALS: Goal[] = ["maintain", "lose", "gain"];

export function ProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter();

  const [sex, setSex] = useState<Sex>(initialProfile?.sex ?? "male");
  const [weightLb, setWeightLb] = useState(initialProfile?.weight_lb?.toString() ?? "");
  const [heightIn, setHeightIn] = useState(initialProfile?.height_in?.toString() ?? "");
  const [age, setAge] = useState(initialProfile?.age?.toString() ?? "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activity_level ?? "moderately_active",
  );
  const [goal, setGoal] = useState<Goal>(initialProfile?.goal ?? "maintain");
  const [manualOverride, setManualOverride] = useState(
    initialProfile?.targets_manual_override ?? false,
  );
  const [manualCalories, setManualCalories] = useState(
    initialProfile?.calories?.toString() ?? "",
  );
  const [manualProtein, setManualProtein] = useState(initialProfile?.protein?.toString() ?? "");
  const [manualCarbs, setManualCarbs] = useState(initialProfile?.carbs?.toString() ?? "");
  const [manualFat, setManualFat] = useState(initialProfile?.fat?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const weightNum = Number(weightLb);
  const heightNum = Number(heightIn);
  const ageNum = Number(age);
  const inputsComplete = weightNum > 0 && heightNum > 0 && ageNum > 0;

  const recalcPreview = inputsComplete
    ? computeTargets({
        sex,
        weightLb: weightNum,
        heightIn: heightNum,
        age: ageNum,
        activityLevel,
        goal,
      })
    : null;

  const manualTargets: ComputedTargets | null =
    manualCalories && manualProtein && manualCarbs && manualFat
      ? {
          calories: Number(manualCalories),
          protein: Number(manualProtein),
          carbs: Number(manualCarbs),
          fat: Number(manualFat),
        }
      : null;

  const mismatch = manualTargets ? macroCalorieMismatch(manualTargets) : 0;
  const mismatchWarning =
    manualTargets && Math.abs(mismatch) > 50
      ? `Protein/carbs/fat grams add up to about ${mismatch > 0 ? "+" : ""}${Math.round(mismatch)} cal ${mismatch > 0 ? "more" : "less"} than your calorie target. That's fine if it's intentional.`
      : null;

  const submit = () => {
    setError(null);
    if (!inputsComplete) {
      setError("Fill in weight, height, and age.");
      return;
    }
    if (manualOverride && !manualTargets) {
      setError("Fill in calories, protein, carbs, and fat.");
      return;
    }
    startTransition(async () => {
      const result = await saveProfile(
        {
          sex,
          weightLb: weightNum,
          heightIn: heightNum,
          age: ageNum,
          activityLevel,
          goal,
        },
        manualOverride ? manualTargets : null,
      );
      if (result.error) {
        setError(result.error);
      } else if (initialProfile) {
        // Editing an existing profile — unchanged behavior, go straight
        // back to the dashboard.
        router.push("/");
      } else {
        // First-time save — offer the (optional) day-types step next
        // instead of jumping straight to the dashboard.
        router.push("/settings?onboarded=1");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Goal</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  goal === g
                    ? "border-tennessee bg-tennessee text-white"
                    : "border-neutral-300 hover:border-tennessee/60 dark:border-neutral-700"
                }`}
              >
                {GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Biological sex <span className="text-neutral-400">(used by the RMR formula)</span>
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  sex === s
                    ? "border-tennessee bg-tennessee text-white"
                    : "border-neutral-300 hover:border-tennessee/60 dark:border-neutral-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500">Weight (lb)</label>
            <input
              type="number"
              step="any"
              min={1}
              value={weightLb}
              onChange={(e) => setWeightLb(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">Height (in)</label>
            <input
              type="number"
              step="any"
              min={1}
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">Age</label>
            <input
              type="number"
              step="1"
              min={1}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Activity level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={manualOverride}
          onChange={(e) => setManualOverride(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 accent-tennessee dark:border-neutral-700"
        />
        Set custom targets manually
      </label>

      {manualOverride ? (
        <div className="rounded-lg border border-tennessee/30 bg-tennessee/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tennessee">
            Your custom targets
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Calories</label>
              <input
                type="number"
                step="any"
                min={0}
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Protein (g)</label>
              <input
                type="number"
                step="any"
                min={0}
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Carbs (g)</label>
              <input
                type="number"
                step="any"
                min={0}
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Fat (g)</label>
              <input
                type="number"
                step="any"
                min={0}
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>
          {mismatchWarning && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">{mismatchWarning}</p>
          )}
          <p className="mt-2 text-xs text-neutral-400">
            These won&apos;t be recalculated from your stats above unless you turn this off and
            save again.
          </p>
        </div>
      ) : (
        recalcPreview && (
          <div className="rounded-lg border border-tennessee/30 bg-tennessee/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tennessee">
              Your targets (recalculated preview)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <span className="text-neutral-500">Calories</span>
                <p className="font-semibold">{recalcPreview.calories}</p>
              </div>
              <div>
                <span className="text-neutral-500">Protein</span>
                <p className="font-semibold">{recalcPreview.protein}g</p>
              </div>
              <div>
                <span className="text-neutral-500">Carbs</span>
                <p className="font-semibold">{recalcPreview.carbs}g</p>
              </div>
              <div>
                <span className="text-neutral-500">Fat</span>
                <p className="font-semibold">{recalcPreview.fat}g</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">Not saved until you confirm below.</p>
          </div>
        )
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="w-full rounded-md bg-tennessee px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save targets"}
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/actions/profile";
import {
  computeTargets,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type Sex,
  type ActivityLevel,
  type Goal,
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const weightNum = Number(weightLb);
  const heightNum = Number(heightIn);
  const ageNum = Number(age);
  const inputsComplete = weightNum > 0 && heightNum > 0 && ageNum > 0;

  const preview = inputsComplete
    ? computeTargets({
        sex,
        weightLb: weightNum,
        heightIn: heightNum,
        age: ageNum,
        activityLevel,
        goal,
      })
    : null;

  const submit = () => {
    setError(null);
    if (!inputsComplete) {
      setError("Fill in weight, height, and age.");
      return;
    }
    startTransition(async () => {
      const result = await saveProfile({
        sex,
        weightLb: weightNum,
        heightIn: heightNum,
        age: ageNum,
        activityLevel,
        goal,
      });
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

      {preview && (
        <div className="rounded-lg border border-tennessee/30 bg-tennessee/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tennessee">
            Your targets
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <span className="text-neutral-500">Calories</span>
              <p className="font-semibold">{preview.calories}</p>
            </div>
            <div>
              <span className="text-neutral-500">Protein</span>
              <p className="font-semibold">{preview.protein}g</p>
            </div>
            <div>
              <span className="text-neutral-500">Carbs</span>
              <p className="font-semibold">{preview.carbs}g</p>
            </div>
            <div>
              <span className="text-neutral-500">Fat</span>
              <p className="font-semibold">{preview.fat}g</p>
            </div>
          </div>
        </div>
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

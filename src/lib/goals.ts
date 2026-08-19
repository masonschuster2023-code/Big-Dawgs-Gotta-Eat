// Pure calculation logic — no server/client dependency, so it can run
// client-side for a live preview while filling out the form, and
// server-side when actually persisting.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active";
export type Goal = "maintain" | "lose" | "gain";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  lightly_active: "Lightly active (1-3 days/week)",
  moderately_active: "Moderately active (3-5 days/week)",
  very_active: "Very active (6-7 days/week)",
};

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: "Maintain weight",
  lose: "Lose weight",
  gain: "Gain weight",
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

export interface ProfileInputs {
  sex: Sex;
  weightLb: number;
  heightIn: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface ComputedTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Mifflin-St Jeor RMR -> TDEE -> goal-adjusted calories -> macros.
export function computeTargets(inputs: ProfileInputs): ComputedTargets {
  const weightKg = inputs.weightLb * LB_TO_KG;
  const heightCm = inputs.heightIn * IN_TO_CM;

  const rmr =
    inputs.sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * inputs.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * inputs.age - 161;

  const tdee = rmr * ACTIVITY_MULTIPLIERS[inputs.activityLevel];

  const calories = inputs.goal === "lose" ? tdee - 500 : inputs.goal === "gain" ? tdee + 350 : tdee;

  // Higher protein target during a surplus supports the muscle-building
  // purpose of the surplus.
  const proteinPerLb = inputs.goal === "gain" ? 1.2 : 1.0;
  const protein = inputs.weightLb * proteinPerLb;

  const fatCalories = calories * 0.25;
  const fat = fatCalories / 9;

  const proteinCalories = protein * 4;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.max(0, carbCalories / 4);

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

// Manual override reconciliation: how far a manually-entered calorie total
// is from what the entered macro grams actually add up to. Used to warn,
// not block — the user is explicitly overriding the formula, so grams that
// don't perfectly reconcile with calories is expected slack, not an error.
export function macroCalorieMismatch(targets: ComputedTargets): number {
  const fromMacros = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
  return fromMacros - targets.calories;
}

// Custom day types (Part B): each selected type contributes its own
// calorie offset plus independent signed protein/carb/fat gram offsets,
// summed on top of the Part A baseline. Multiple selections just sum —
// that's what makes a combo day naturally add up to more than a
// single-activity day without predefining every combination.
//
// The macro offsets are independent of the calorie offset (not a split of
// it), so a day type can move a macro in the opposite direction from
// calories — e.g. more calories but less fat — which a
// percentage-of-calorie-offset "skew" can't represent.
export interface DayTypeOffset {
  calorieOffset: number;
  proteinOffsetG: number;
  carbOffsetG: number;
  fatOffsetG: number;
}

export function applyDayTypeOffsets(
  baseline: ComputedTargets,
  selected: DayTypeOffset[],
): ComputedTargets {
  let calories = baseline.calories;
  let protein = baseline.protein;
  let carbs = baseline.carbs;
  let fat = baseline.fat;

  for (const dt of selected) {
    calories += dt.calorieOffset;
    protein += dt.proteinOffsetG;
    carbs += dt.carbOffsetG;
    fat += dt.fatOffsetG;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

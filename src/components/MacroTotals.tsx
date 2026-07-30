import type { Database } from "@/lib/supabase/database.types";

type DayType = Database["public"]["Tables"]["day_types"]["Row"];

function RangeBar({
  label,
  value,
  min,
  max,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const inRange = value >= min && value <= max;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={inRange ? "text-green-600" : "text-neutral-500"}>
          {Math.round(value)} / {min === max ? max : `${min}–${max}`}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${inRange ? "bg-green-500" : "bg-neutral-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroTotals({
  dayType,
  totals,
}: {
  dayType: DayType | null;
  totals: { calories: number; protein: number; carbs: number; fat: number };
}) {
  if (!dayType) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        Pick a day type above to see your targets.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <RangeBar
        label="Calories"
        value={totals.calories}
        min={dayType.calorie_min}
        max={dayType.calorie_max}
      />
      <RangeBar
        label="Protein (g)"
        value={totals.protein}
        min={dayType.protein_g}
        max={dayType.protein_g}
      />
      <RangeBar label="Fat (g)" value={totals.fat} min={dayType.fat_g} max={dayType.fat_g} />
      <RangeBar
        label="Carbs (g)"
        value={totals.carbs}
        min={dayType.carb_min}
        max={dayType.carb_max}
      />
    </div>
  );
}

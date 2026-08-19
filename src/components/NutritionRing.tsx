// Macro colors — no existing convention to reuse (MacroBreakdown's bars are
// all the same brand color), so this establishes one: protein keeps the
// brand color since it's usually the macro users care most about, carbs and
// fat get distinct, unrelated hues so all three read apart at a glance.
export const MACRO_COLORS = {
  protein: "#ff8200", // brand tennessee
  carbs: "#3b82f6", // blue-500
  fat: "#10b981", // emerald-500
} as const;

const SIZE = 180;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function NutritionRing({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  // Ring segments are sized by gram share, not calorie share — grams are
  // what's directly comparable to a serving/unit change, and it's what the
  // columns below report per-macro too.
  const totalGrams = protein + carbs + fat;
  const segments =
    totalGrams > 0
      ? [
          { grams: protein, color: MACRO_COLORS.protein },
          { grams: carbs, color: MACRO_COLORS.carbs },
          { grams: fat, color: MACRO_COLORS.fat },
        ]
      : [];

  let offset = 0;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-neutral-100 dark:stroke-neutral-800"
        />
        {segments.map((seg, i) => {
          const fraction = seg.grams / totalGrams;
          const dash = fraction * CIRCUMFERENCE;
          const circle = (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap={segments.length > 1 ? "butt" : "round"}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{Math.round(calories)}</span>
        <span className="text-xs text-neutral-500">cal</span>
      </div>
    </div>
  );
}

export function MacroColumns({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const pct = (grams: number, calsPerGram: number) =>
    calories > 0 ? Math.round(((grams * calsPerGram) / calories) * 100) : 0;

  const columns = [
    { label: "Carbs", grams: carbs, pct: pct(carbs, 4), color: MACRO_COLORS.carbs },
    { label: "Fat", grams: fat, pct: pct(fat, 9), color: MACRO_COLORS.fat },
    { label: "Protein", grams: protein, pct: pct(protein, 4), color: MACRO_COLORS.protein },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {columns.map((c) => (
        <div key={c.label}>
          <p className="text-xs font-medium text-neutral-500">{c.label}</p>
          <p className="text-sm font-semibold" style={{ color: c.color }}>
            {c.pct}%
          </p>
          <p className="text-xs text-neutral-400">{Math.round(c.grams)}g</p>
        </div>
      ))}
    </div>
  );
}

import type { Database } from "@/lib/supabase/database.types";

type DayType = Database["public"]["Tables"]["day_types"]["Row"];

function MacroRow({ label, consumed, target }: { label: string; consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const over = consumed > target;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={over ? "text-red-600" : "text-neutral-500"}>
          {Math.round(consumed)}g / {Math.round(target)}g
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-tennessee"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroBreakdown({
  dayType,
  totals,
}: {
  dayType: DayType | null;
  totals: { carbs: number; fat: number; protein: number };
}) {
  if (!dayType) {
    return (
      <p className="text-sm text-neutral-400">Pick a day type above to see your macro targets.</p>
    );
  }

  return (
    <div className="space-y-3">
      <MacroRow label="Carbs" consumed={totals.carbs} target={dayType.carb_max} />
      <MacroRow label="Fat" consumed={totals.fat} target={dayType.fat_g} />
      <MacroRow label="Protein" consumed={totals.protein} target={dayType.protein_g} />
    </div>
  );
}

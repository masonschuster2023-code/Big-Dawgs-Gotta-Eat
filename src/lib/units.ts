// Unit conversion for the Add Food detail screen. No per-food portion or
// density data exists anywhere in this app (USDA/catalog/barcode data is
// always per-100g; personal/manual foods are one arbitrary serving with
// absolute macros) — so this is deliberately approximate where it has to
// be, not derived from real per-food data:
//
// - g/oz/lb are exact (pure mass, fixed constants).
// - cup/fl oz/tbsp/tsp assume water density (~1 g/mL) — a standard,
//   commonly-used approximation, not exact for every food (oil, honey,
//   etc. will be off).
// - A small set of common discrete items (egg, banana, apple, a slice)
//   use conventional reference weights (e.g. a "large egg" ~50g), matched
//   by keyword against the food name. Rough on purpose — there's no way
//   to know these exactly for an arbitrary food without real per-food
//   data this app doesn't have.
//
// None of this applies unless the food has a known gram basis in the
// first place (see FoodReference.referenceGrams) — a food logged with an
// arbitrary non-gram serving (e.g. Quick Add "1 scoop" with no weight
// given at all) has nothing to convert from, so it only ever offers its
// own native unit.

export interface ComputedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodReference {
  // Grams the stored macros correspond to. Null means there's no gram
  // anchor at all (an arbitrary manually-typed serving) — in that case
  // only nativeUnitLabel is usable, no unit picker.
  referenceGrams: number | null;
  referenceMacros: ComputedMacros;
  // What to show/use when there's no gram anchor, e.g. "1 scoop".
  nativeUnitLabel: string;
  // The real-world amount to preselect, when known and different from
  // referenceGrams. referenceGrams for a per-100g source (catalog/USDA/
  // barcode) is a data-source artifact ("this is the basis the macros are
  // reported against"), not a real serving — defaulting to it produces
  // e.g. a 100g default for a product whose actual serving is 55g. Falls
  // back to referenceGrams when absent.
  defaultTotalGrams?: number;
}

export interface UnitOption {
  id: string;
  label: string;
  grams: number;
}

const MASS_UNITS: UnitOption[] = [
  { id: "g", label: "1 g", grams: 1 },
  { id: "oz", label: "1 oz", grams: 28.3495 },
  { id: "lb", label: "1 lb", grams: 453.592 },
];

const VOLUME_UNITS: UnitOption[] = [
  { id: "cup", label: "1 cup", grams: 240 },
  { id: "fl_oz", label: "1 fl oz", grams: 30 },
  { id: "tbsp", label: "1 tbsp", grams: 15 },
  { id: "tsp", label: "1 tsp", grams: 5 },
];

const DISCRETE_UNIT_KEYWORDS: { keyword: string; unit: UnitOption }[] = [
  { keyword: "egg", unit: { id: "egg", label: "1 egg", grams: 50 } },
  { keyword: "banana", unit: { id: "banana", label: "1 banana", grams: 118 } },
  { keyword: "apple", unit: { id: "apple", label: "1 apple", grams: 182 } },
  { keyword: "slice", unit: { id: "slice", label: "1 slice", grams: 28 } },
  { keyword: "bread", unit: { id: "bread_slice", label: "1 slice", grams: 28 } },
];

export function parseGramsServing(servingSize: string | null | undefined): number | null {
  if (!servingSize) return null;
  const match = servingSize.trim().match(/^(\d+(?:\.\d+)?)\s*g(?:rams?)?$/i);
  return match ? Number(match[1]) : null;
}

// Every option available for a food with a gram anchor: any keyword-matched
// discrete units first, then the standard mass/volume set. De-duped by id.
export function unitOptionsFor(foodName: string): UnitOption[] {
  const lower = foodName.toLowerCase();
  const discrete = DISCRETE_UNIT_KEYWORDS.filter((d) => lower.includes(d.keyword)).map(
    (d) => d.unit,
  );
  const seen = new Set<string>();
  return [...discrete, ...MASS_UNITS, ...VOLUME_UNITS].filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

export function macrosForGrams(ref: FoodReference, totalGrams: number): ComputedMacros {
  if (ref.referenceGrams === null || ref.referenceGrams === 0) return ref.referenceMacros;
  const rate = totalGrams / ref.referenceGrams;
  return {
    calories: ref.referenceMacros.calories * rate,
    protein: ref.referenceMacros.protein * rate,
    carbs: ref.referenceMacros.carbs * rate,
    fat: ref.referenceMacros.fat * rate,
  };
}

export function macrosForUnit(
  ref: FoodReference,
  unitGrams: number,
  servings: number,
): ComputedMacros {
  if (ref.referenceGrams === null) {
    return {
      calories: ref.referenceMacros.calories * servings,
      protein: ref.referenceMacros.protein * servings,
      carbs: ref.referenceMacros.carbs * servings,
      fat: ref.referenceMacros.fat * servings,
    };
  }
  return macrosForGrams(ref, unitGrams * servings);
}

// The multiplier equivalent to the food's own already-stored per-reference
// macros — this is what keeps unit/serving selection purely presentational.
// Passed as `quantity` (or used to derive `grams`) to the existing save
// actions, none of which change.
export function effectiveQuantity(ref: FoodReference, unitGrams: number, servings: number): number {
  if (ref.referenceGrams === null) return servings;
  return (unitGrams * servings) / ref.referenceGrams;
}

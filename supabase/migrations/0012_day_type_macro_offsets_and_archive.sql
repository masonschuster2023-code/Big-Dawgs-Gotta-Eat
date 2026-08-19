-- Two changes to custom_day_types, both needed for Feature 2 of the
-- goals/day-types revamp:
--
-- 1. Replace the protein/carb/fat "skew" percentages (0-100, must sum to
--    100) with direct signed gram offsets. The skew model can only ever
--    move a macro in the same direction as the calorie offset — it cannot
--    represent a day type where, say, fat target goes *down* while
--    calories go *up*, which is exactly what's needed to migrate Mason's
--    legacy day_types rows (their calorie/protein/fat/carb targets were
--    each set independently by hand, not derived from one split). Direct
--    grams also don't need to reconcile with the calorie offset — same
--    "warn, don't block" spirit as the Feature 1 manual-override check.
--
-- 2. Add `archived`, for the CRUD delete flow: deleting a day type with
--    historical selections attached must not orphan or mutate that
--    history, so delete is really "hide from future selection," not a row
--    removal.
--
-- Existing rows are converted losslessly: their old skew% already only
-- ever got used as calorie_offset * skew/100/{4 or 9} at render time (see
-- the old applyDayTypeOffsets), so precomputing that once here produces
-- identical numbers going forward, not just an equivalent formula.
--
-- Run this once in the Supabase SQL editor, after 0011_manual_targets_override.sql.

alter table custom_day_types
  add column if not exists protein_offset_g numeric,
  add column if not exists carb_offset_g numeric,
  add column if not exists fat_offset_g numeric,
  add column if not exists archived boolean not null default false;

update custom_day_types
set
  protein_offset_g = round(calorie_offset * protein_skew / 100.0 / 4, 1),
  carb_offset_g = round(calorie_offset * carb_skew / 100.0 / 4, 1),
  fat_offset_g = round(calorie_offset * fat_skew / 100.0 / 9, 1)
where protein_offset_g is null;

alter table custom_day_types
  alter column protein_offset_g set not null,
  alter column protein_offset_g set default 0,
  alter column carb_offset_g set not null,
  alter column carb_offset_g set default 0,
  alter column fat_offset_g set not null,
  alter column fat_offset_g set default 0;

alter table custom_day_types
  drop constraint if exists custom_day_types_skew_sums_100,
  drop column if exists protein_skew,
  drop column if exists carb_skew,
  drop column if exists fat_skew;

-- Selections and the dashboard should only ever offer/apply active types;
-- archived ones stay selectable in history because past
-- custom_day_type_selections rows aren't touched, they just stop being
-- offered for new dates.
create index if not exists custom_day_types_user_active_idx
  on custom_day_types (user_id)
  where not archived;

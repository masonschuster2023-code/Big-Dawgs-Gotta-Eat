-- Custom day types: a per-user, self-defined list of activities (e.g.
-- "Lift", "Baseball") that adjust today's calorie/macro targets by an
-- offset from the Part A baseline. Purely additive — does NOT touch,
-- rename, or alter the existing day_types table, which continues to drive
-- the original day-type picker and the weekly view unchanged. Named
-- custom_day_types specifically to avoid any collision with day_types.
--
-- Run this once in the Supabase SQL editor, after 0008_profiles.sql.

create table if not exists custom_day_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  -- Relative to the Part A baseline; can be negative.
  calorie_offset numeric not null default 0,
  -- How the offset calories are split across macros. Sum must be 100.
  -- Default skews entirely toward carbs per the spec.
  protein_skew int not null default 0 check (protein_skew between 0 and 100),
  carb_skew int not null default 100 check (carb_skew between 0 and 100),
  fat_skew int not null default 0 check (fat_skew between 0 and 100),
  created_at timestamptz not null default now(),
  constraint custom_day_types_skew_sums_100 check (protein_skew + carb_skew + fat_skew = 100)
);

alter table custom_day_types enable row level security;

create policy "custom_day_types owned by user"
  on custom_day_types for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Per-user, per-date selection set — multi-select, so a combo day (e.g.
-- both "Lift" and "Baseball" the same day) is just multiple rows, and
-- offsets sum naturally without predefining every combination up front.
create table if not exists custom_day_type_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  custom_day_type_id uuid not null references custom_day_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, date, custom_day_type_id)
);

alter table custom_day_type_selections enable row level security;

create policy "custom_day_type_selections owned by user"
  on custom_day_type_selections for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists custom_day_type_selections_user_date_idx
  on custom_day_type_selections (user_id, date);

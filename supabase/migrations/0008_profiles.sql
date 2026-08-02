-- Per-user goal profile: body stats + activity + goal, plus the computed
-- baseline (calories/protein/carbs/fat) derived from them via Mifflin-St
-- Jeor. This becomes the source for the dashboard's calorie ring and macro
-- bars, replacing day_types' calorie_max/protein_g/fat_g/carb_max — those
-- columns are left in place (day_types still drives the day-type picker and
-- the weekly view, both out of scope for this change) but the dashboard no
-- longer reads them.
--
-- Weight/height are stored in the units the user actually enters (lb/in),
-- not converted to kg/cm at rest — conversion happens only at calculation
-- time, so re-opening settings always shows back exactly what was typed.
--
-- Run this once in the Supabase SQL editor, after 0007_meals.sql.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  weight_lb numeric not null check (weight_lb > 0),
  height_in numeric not null check (height_in > 0),
  age int not null check (age > 0),
  activity_level text not null check (
    activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active')
  ),
  goal text not null check (goal in ('maintain', 'lose', 'gain')),
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles owned by user"
  on profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

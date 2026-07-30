-- Big Dawgs Gotta Eat — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- day_types: fixed config, one row per day type. Shared read-only reference
-- data — not user-scoped, since the four types and their targets are the
-- same regardless of who's logged in.
-- ---------------------------------------------------------------------------
create table if not exists day_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  calorie_min int not null,
  calorie_max int not null,
  protein_g int not null,
  fat_g int not null,
  carb_min int not null,
  carb_max int not null,
  created_at timestamptz not null default now()
);

alter table day_types enable row level security;

create policy "day_types readable by authenticated users"
  on day_types for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- daily_logs: one row per calendar day per user.
-- ---------------------------------------------------------------------------
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  day_type_id uuid references day_types(id),
  going_out_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table daily_logs enable row level security;

create policy "daily_logs owned by user"
  on daily_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- foods: personal food library.
-- ---------------------------------------------------------------------------
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'manual' check (source in ('manual', 'open_food_facts', 'database_search')),
  barcode text,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  serving_size text,
  created_at timestamptz not null default now()
);

alter table foods enable row level security;

create policy "foods owned by user"
  on foods for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists foods_user_barcode_idx on foods (user_id, barcode);

-- ---------------------------------------------------------------------------
-- food_overrides: personal corrections for bad barcode data, keyed by barcode.
-- ---------------------------------------------------------------------------
create table if not exists food_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode text not null,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  created_at timestamptz not null default now(),
  unique (user_id, barcode)
);

alter table food_overrides enable row level security;

create policy "food_overrides owned by user"
  on food_overrides for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- food_logs: actual entries, tied to a daily_log and a food.
-- ---------------------------------------------------------------------------
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  food_id uuid not null references foods(id) on delete restrict,
  quantity numeric not null default 1,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now()
);

alter table food_logs enable row level security;

create policy "food_logs owned by user"
  on food_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists food_logs_daily_log_idx on food_logs (daily_log_id);

-- ---------------------------------------------------------------------------
-- Seed the four day types with their macro targets.
-- ---------------------------------------------------------------------------
insert into day_types (name, calorie_min, calorie_max, protein_g, fat_g, carb_min, carb_max)
values
  ('Run + Lift Day', 2950, 3150, 200, 70, 385, 410),
  ('Run Day', 2700, 2900, 195, 65, 345, 370),
  ('Lift Day', 2600, 2800, 195, 65, 325, 350),
  ('Rest Day', 2300, 2500, 190, 55, 270, 295)
on conflict (name) do update set
  calorie_min = excluded.calorie_min,
  calorie_max = excluded.calorie_max,
  protein_g = excluded.protein_g,
  fat_g = excluded.fat_g,
  carb_min = excluded.carb_min,
  carb_max = excluded.carb_max;

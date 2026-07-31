-- Shared, cross-user food reference data — separate from the per-user
-- `foods` table. Populated by USDA FoodData Central lookups, cached once
-- and reused by every user's searches from then on, so nobody re-hits the
-- USDA API for a food someone else already looked up. Macros are stored
-- per 100g, same convention as the existing FDC integration.
--
-- Run this once in the Supabase SQL editor, after 0003_barcode_unique.sql.

create table if not exists food_catalog (
  id uuid primary key default gen_random_uuid(),
  fdc_id text not null unique,
  name text not null,
  brand text,
  serving_size numeric,
  serving_unit text,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  source text not null default 'usda' check (source in ('usda')),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

alter table food_catalog enable row level security;

create policy "food_catalog readable by authenticated users"
  on food_catalog for select
  to authenticated
  using (true);

create policy "food_catalog writable by authenticated users"
  on food_catalog for insert
  to authenticated
  with check (true);

create policy "food_catalog updatable by authenticated users"
  on food_catalog for update
  to authenticated
  using (true)
  with check (true);

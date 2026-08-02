-- Saved meal templates: a user-defined combo of foods that can be logged
-- as a unit later.
--
-- meal_items references `foods` the same way food_logs already does — a
-- single not-null FK, no source discriminator. There's no existing
-- foods/food_catalog discriminator pattern to reuse (food_logs.food_id is a
-- plain FK to foods only; catalog/USDA hits are always resolved into a
-- personal foods row before anything gets persisted). This mirrors that.
--
-- Run this once in the Supabase SQL editor, after 0006_food_catalog_photo_source.sql.

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

alter table meals enable row level security;

create policy "meals owned by user"
  on meals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid not null references foods(id) on delete restrict,
  quantity numeric not null default 1,
  created_at timestamptz not null default now()
);

alter table meal_items enable row level security;

-- meal_items has no user_id of its own — ownership is scoped through the
-- parent meal, same idea as food_logs being scoped directly since it does
-- have a user_id (meal_items doesn't need one; nothing queries it except
-- via its meal).
create policy "meal_items owned via parent meal"
  on meal_items for all
  to authenticated
  using (exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid()))
  with check (exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid()));

create index if not exists meal_items_meal_id_idx on meal_items (meal_id);

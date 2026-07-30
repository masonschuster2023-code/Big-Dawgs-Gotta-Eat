-- Adds USDA FoodData Central lookup caching to the foods table.
-- Run this once in the Supabase SQL editor, after 0001_init.sql.

alter table foods add column if not exists fdc_id text;

-- A user can only cache a given FDC food once. Rows with fdc_id null
-- (manual/barcode entries) are unaffected — Postgres unique indexes don't
-- treat null as equal to null, so they never collide.
create unique index if not exists foods_user_fdc_id_key on foods (user_id, fdc_id);

-- Lets photo-read nutrition labels get cached into food_catalog alongside
-- USDA hits. These have no fdc_id (no natural dedup key exists for a photo
-- capture), so fdc_id must become nullable; NULLs don't collide with the
-- existing unique constraint. Also widens the source check to allow
-- 'photo_label' instead of only 'usda'.
--
-- Run this once in the Supabase SQL editor, after 0005_photo_food_source.sql.

alter table food_catalog alter column fdc_id drop not null;

alter table food_catalog drop constraint if exists food_catalog_source_check;
alter table food_catalog add constraint food_catalog_source_check
  check (source in ('usda', 'photo_label'));

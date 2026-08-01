-- Extends foods.source to distinguish AI photo-logged entries:
--   photo_label    — a nutrition label was read directly from the photo
--                    (real OCR'd numbers, treated like a verified USDA hit
--                    and cached into the shared food_catalog)
--   photo_estimate — a visual guess of a homemade/restaurant plate with no
--                    label (personal-only, never cached into food_catalog)
--
-- Run this once in the Supabase SQL editor, after 0004_food_catalog.sql.

alter table foods drop constraint if exists foods_source_check;

alter table foods add constraint foods_source_check
  check (source in ('manual', 'open_food_facts', 'database_search', 'photo_label', 'photo_estimate'));

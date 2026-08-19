-- Self-service goals editing: lets a user either re-run the Mifflin-St Jeor
-- calculation from updated inputs, or set calorie/macro targets manually.
-- targets_manual_override records which mode produced the stored
-- calories/protein/carbs/fat on `profiles`, so a later profile-inputs edit
-- knows whether to recompute them or leave a manual entry alone.
--
-- Run this once in the Supabase SQL editor, after 0010_weight_tracking.sql.

alter table profiles
  add column if not exists targets_manual_override boolean not null default false;

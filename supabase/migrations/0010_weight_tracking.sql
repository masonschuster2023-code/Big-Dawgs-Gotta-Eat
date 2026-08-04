-- Weight tracking: a real history, separate from profiles.weight_lb (which
-- is just the single current-value input to the Part A RMR calculation, not
-- a log). Two tables:
--
-- weight_logs: one entry per user per day (upsert on date, same pattern as
-- daily_logs/custom_day_type_selections elsewhere in this app). The 7-day
-- rolling average and the graph are both computed in application code from
-- this raw data, not stored.
--
-- weight_periods: "since reset" phases. end_date null means the period is
-- currently active; starting a new phase closes the active one (sets its
-- end_date) and opens a new one. Past, closed periods are simply the rows
-- left behind with a non-null end_date — no separate history table needed.
--
-- Deliberately NOT wired into profiles.weight_lb — logging a weight here
-- does not touch the RMR calculation baseline. See the app's own comments
-- at the call site for why.
--
-- Run this once in the Supabase SQL editor, after 0009_custom_day_types.sql.

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  weight numeric not null check (weight > 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table weight_logs enable row level security;

create policy "weight_logs owned by user"
  on weight_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weight_logs_user_date_idx on weight_logs (user_id, date);

create table if not exists weight_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null,
  start_weight numeric not null check (start_weight > 0),
  end_date date,
  created_at timestamptz not null default now()
);

alter table weight_periods enable row level security;

create policy "weight_periods owned by user"
  on weight_periods for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- At most one active (end_date is null) period per user at a time.
create unique index if not exists weight_periods_one_active_per_user
  on weight_periods (user_id)
  where end_date is null;

create index if not exists weight_periods_user_idx on weight_periods (user_id);

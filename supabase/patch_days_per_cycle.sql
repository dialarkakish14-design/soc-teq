-- Daily logging (Today/Cases/Summary/Track My Info) was scoped by
-- program+pgy only, same gap resources had before patch_resources_per_
-- cycle.sql -- so starting a new cycle reset claims and shared readings,
-- but every day/topic/rating ever logged kept showing up forever. Scopes
-- days (and everything that joins through it: sessions, topics, ratings,
-- absences) to the current cycle.
--
-- Only days_select and days_insert actually need changing -- Postgres RLS
-- applies to every access to a table, including subqueries inside another
-- table's policy, so tightening what's visible in `days` automatically
-- narrows sessions_select/topics_select/ratings_select/absences_select
-- too, since each of those already checks visibility by joining back to
-- days. No changes needed to those policies, or to Cases.tsx/Team.tsx,
-- which read topics/days with no explicit cycle filter of their own.
--
-- Run this once in the Supabase SQL Editor.

alter table days add column if not exists cycle_id uuid references cycles (id) on delete cascade;

-- Backfill: at the time this runs, every program year has at most one
-- cycle ever, so every existing day unambiguously belongs to it.
update days d
set cycle_id = (
  select c.id from cycles c
  where c.program_id = d.program_id and c.pgy = d.pgy
  order by c.created_at asc
  limit 1
)
where cycle_id is null;

-- Null when no cycle has ever been created yet for that program year --
-- daily logging can start before "Begin Cycle 1" is ever clicked, and in
-- that state everything should stay visible rather than nothing at all.
create or replace function my_current_cycle_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from cycles c
  where c.program_id = my_program_id() and c.pgy = my_pgy()
  order by c.created_at desc
  limit 1;
$$;

drop policy if exists days_select on days;
create policy days_select on days for select
  using (
    program_id = my_program_id()
    and pgy = my_pgy()
    and (my_current_cycle_id() is null or cycle_id is not distinct from my_current_cycle_id())
  );

drop policy if exists days_insert on days;
create policy days_insert on days for insert
  with check (
    program_id = my_program_id()
    and pgy = my_pgy()
    and cycle_id is not distinct from my_current_cycle_id()
  );

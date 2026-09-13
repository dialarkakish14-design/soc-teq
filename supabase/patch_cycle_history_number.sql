-- Adds the same computed cycle_number (see patch_cycle_number.sql) to
-- list_my_cycle_history's rows, so "Cycle history" can say "Cycle 1"
-- instead of just a start date. Run this once in the Supabase SQL Editor.

create or replace function list_my_cycle_history()
returns table (
  id uuid,
  cycle_number int,
  start_date date,
  phase4_started_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    (select count(*)::int from cycles c2 where c2.program_id = c.program_id and c2.pgy = c.pgy and c2.created_at <= c.created_at),
    c.start_date,
    c.phase4_started_at
  from cycles c
  where (
      exists (select 1 from claims cl where cl.cycle_id = c.id and cl.resident_id = auth.uid())
      or exists (select 1 from assessments a where a.cycle_id = c.id and a.resident_id = auth.uid())
    )
    and c.id <> (
      select c2.id from cycles c2
      where c2.program_id = c.program_id and c2.pgy = c.pgy
      order by c2.created_at desc
      limit 1
    )
  order by c.start_date desc;
$$;

grant execute on function list_my_cycle_history() to authenticated;

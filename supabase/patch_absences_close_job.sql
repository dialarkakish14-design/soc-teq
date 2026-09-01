-- Patch: absences table + the 4am close job (build spec section 6).
-- Adds `absences` (declared vs no_response), a `closed_at` marker on `days`,
-- and a function that backfills no_response rows once a day's 4am cutoff has
-- passed. Schedule it with pg_cron (see bottom of this file) so closing is a
-- scheduled job, not a frontend check, per the spec.

alter table days add column if not exists closed_at timestamptz;

create table absences (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  reason text not null check (reason in ('declared', 'no_response')),
  created_at timestamptz not null default now(),
  unique (topic_id, resident_id)
);

alter table absences enable row level security;

-- Cohort-scoped read, same pattern as ratings.
create policy absences_select on absences for select
  using (
    exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

-- A resident may only declare their own absence, on a covered topic, while
-- the day is still open — this is the "I wasn't at this session" button.
-- The automatic no_response rows the close job writes bypass RLS (it runs
-- as a security definer function), so this policy only governs residents
-- declaring their own absence.
create policy absences_insert on absences for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and t.soc_covered = true
        and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date)
    )
  );

-- Declaring absence should also be possible to undo while still open (in
-- case someone taps it by mistake and then wants to rate instead).
create policy absences_delete on absences for delete
  using (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and is_day_open(d.date)
    )
  );

-- The close job: for every day whose 4am cutoff has passed and hasn't been
-- processed yet, every cohort member who neither rated nor declared absent
-- on each SoC-covered topic gets a no_response row. Runs as security
-- definer so it can write across the whole table regardless of who
-- (if anyone) triggers it.
create or replace function close_finished_days()
returns void
language plpgsql security definer set search_path = public as $$
declare
  d record;
begin
  for d in
    select * from days
    where closed_at is null and not is_day_open(date)
  loop
    insert into absences (topic_id, resident_id, reason)
    select t.id, r.id, 'no_response'
    from sessions s
    join topics t on t.session_id = s.id and t.soc_covered = true
    cross join residents r
    where s.day_id = d.id
      and r.program_id = d.program_id
      and r.pgy = d.pgy
      and not exists (select 1 from ratings ra where ra.topic_id = t.id and ra.resident_id = r.id)
      and not exists (select 1 from absences ab where ab.topic_id = t.id and ab.resident_id = r.id)
    on conflict (topic_id, resident_id) do nothing;

    update days set closed_at = now() where id = d.id;
  end loop;
end;
$$;

-- Only the job itself needs to call this — no client-side grant, so a
-- resident calling it directly can't do anything (it isn't exposed via
-- PostgREST's RPC unless explicitly granted, and it isn't here).

-- ---------- schedule it ----------
-- Run this separately, AFTER enabling the pg_cron extension:
-- Dashboard → Database → Extensions → search "pg_cron" → Enable.
-- Then run:
--
--   select cron.schedule('close-finished-days', '*/15 * * * *', 'select close_finished_days()');
--
-- Every 15 minutes is frequent enough that a day closes within 15 minutes
-- of its actual 4am cutoff, and safe to run that often since it only ever
-- touches days that just crossed their cutoff and haven't been closed yet
-- (closed_at is null). This also sidesteps daylight-saving arithmetic that
-- a single fixed UTC cron time would need to account for twice a year.

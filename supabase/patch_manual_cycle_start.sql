-- Starting the 6-month cycle, and later its two remaining phase
-- transitions (Phase 2 "Identification and baseline", Phase 3
-- "Resident-led remediation"), are all deliberate actions any resident
-- can take — not something that silently auto-starts on a tab open or a
-- date rollover, and not restricted to a "program lead" role (there's no
-- reliable way to know who that is for every program that signs up, and
-- Diala can't manually flip that role for every new program either). The
-- in-app copy on each action reminds residents to discuss it with their
-- cohort and program director first — a social checkpoint, not a
-- technical one.
--
-- phase2_started_at and phase3_started_at are kept separate from
-- start_date (and from each other) so each transition is always a
-- visible, explicit choice, matching the app's own 4-phase roadmap:
--   Phase 1 (months 1-3, from start_date): baseline logging.
--   Phase 2 (from phase2_started_at): identification + baseline
--     assessment + claiming gaps. Can't start before 3 months have
--     actually passed.
--   Phase 3 (from phase3_started_at): building/delivering on claims.
--     Only requires phase 2 to have started — the cohort decides when
--     it's actually done, not the calendar.
--   Phase 4 (months end-of-6, still purely date-driven): follow-up
--     assessment — unchanged from before this patch.
--
-- Run this once in the Supabase SQL Editor. If you already ran an earlier
-- version of this file (role-gated, or the single remediation_started_at
-- version), this supersedes it — just run the whole thing again.

alter table cycles add column if not exists phase2_started_at timestamptz;
alter table cycles add column if not exists phase3_started_at timestamptz;

drop policy if exists cycles_insert on cycles;

create or replace function start_cycle(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;
  if exists (select 1 from cycles where program_id = v_program_id and pgy = p_pgy) then
    raise exception 'Cycle 1 has already started for this program year';
  end if;
  insert into cycles (program_id, pgy, start_date) values (v_program_id, p_pgy, current_date);
end;
$$;

grant execute on function start_cycle(text) to authenticated;

create or replace function start_phase2(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_cycle from cycles where program_id = v_program_id and pgy = p_pgy;
  if v_cycle.id is null then
    raise exception 'Cycle 1 hasn''t started yet';
  end if;
  if v_cycle.phase2_started_at is not null then
    raise exception 'Identification and baseline has already started';
  end if;
  if v_cycle.start_date + 90 > current_date then
    raise exception 'Identification and baseline can''t start until 3 months into Cycle 1';
  end if;

  update cycles set phase2_started_at = now() where id = v_cycle.id;
end;
$$;

grant execute on function start_phase2(text) to authenticated;

create or replace function start_phase3(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_cycle from cycles where program_id = v_program_id and pgy = p_pgy;
  if v_cycle.id is null or v_cycle.phase2_started_at is null then
    raise exception 'Identification and baseline hasn''t started yet';
  end if;
  if v_cycle.phase3_started_at is not null then
    raise exception 'Resident-led remediation has already started';
  end if;

  update cycles set phase3_started_at = now() where id = v_cycle.id;
end;
$$;

grant execute on function start_phase3(text) to authenticated;

-- Only relevant if you already ran an earlier version of this file:
drop function if exists start_remediation_cycle(text);
drop function if exists start_remediation_phase(text);
alter table cycles drop column if exists remediation_started_at;

-- ---------- testing helper, for you only ----------
-- The phase-2 gate above requires 3 real months to have passed, which
-- makes it slow to test by hand. To simulate that instantly for a test
-- cycle, backdate its start_date so today already looks like day 91+
-- (run directly in the SQL Editor — bypasses RLS and every check above,
-- same as everything else in this file that only you can run):
--
--   update cycles set start_date = current_date - 91
--   where program_id = (select id from programs where name = '<program name>')
--     and pgy = '<PGY-2|PGY-3|PGY-4>';
--
-- To reset a test cycle back to a clean "just started" state instead of
-- deleting it outright:
--
--   update cycles set start_date = current_date, phase2_started_at = null, phase3_started_at = null
--   where program_id = (select id from programs where name = '<program name>')
--     and pgy = '<PGY-2|PGY-3|PGY-4>';

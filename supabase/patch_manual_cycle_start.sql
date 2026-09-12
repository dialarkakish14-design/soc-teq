-- Starting the 6-month cycle, and later starting its remediation phase
-- (months 4-6), are both deliberate actions any resident can take — not
-- something that silently auto-starts the moment someone opens the Cycle
-- tab (the original behavior), and not restricted to a "program lead"
-- role (there's no reliable way to know who that is for every program
-- that signs up, and Diala can't manually flip that role for every new
-- program either). The in-app copy on both actions reminds residents to
-- discuss it with their cohort and program director first — a social
-- checkpoint, not a technical one.
--
-- remediation_started_at is kept separate from start_date so the months
-- 1-3 -> months 4-6 transition is always a visible, explicit choice
-- ("Start remediation cycle") once 3 months have passed, instead of the
-- UI silently flipping into claim/assessment mode on day 90.
--
-- Run this once in the Supabase SQL Editor. If you already ran an earlier
-- version of this file (the one gating this to role = 'program_lead'),
-- this supersedes it — just run the whole thing again.

alter table cycles add column if not exists remediation_started_at timestamptz;

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

create or replace function start_remediation_phase(p_pgy text)
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
  if v_cycle.remediation_started_at is not null then
    raise exception 'The remediation phase has already started';
  end if;
  if v_cycle.start_date + 90 > current_date then
    raise exception 'The remediation phase can''t start until 3 months into Cycle 1';
  end if;

  update cycles set remediation_started_at = now() where id = v_cycle.id;
end;
$$;

grant execute on function start_remediation_phase(text) to authenticated;

-- Only relevant if you already ran the earlier program_lead-gated version:
drop function if exists start_remediation_cycle(text);

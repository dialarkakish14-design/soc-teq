-- Impact evaluation (Phase 4) becomes an explicit, resident-clicked step
-- instead of silently appearing once 6 months are up, matching Phase 2 and
-- Phase 3's start_phase2()/start_phase3() pattern. Run this once in the
-- Supabase SQL Editor.

alter table cycles add column if not exists phase4_started_at timestamptz;

create or replace function start_phase4(p_pgy text)
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
  if v_cycle.id is null or v_cycle.phase3_started_at is null then
    raise exception 'Resident-led remediation hasn''t started yet';
  end if;
  if v_cycle.phase4_started_at is not null then
    raise exception 'Impact evaluation has already started';
  end if;
  if v_cycle.start_date + 180 > current_date then
    raise exception 'Impact evaluation can''t start until 6 months into Cycle 1';
  end if;

  update cycles set phase4_started_at = now() where id = v_cycle.id;
end;
$$;

grant execute on function start_phase4(text) to authenticated;

-- Lets a cohort member forcibly take over as logger if the current logger
-- forgot to release it (e.g. rushed off, forgot mid-day). Capped at 2 uses
-- per day per day-row, tracked in the new emergency_claims column, so this
-- stays a rare safety valve rather than a normal way to switch loggers.
-- Run this once in the Supabase SQL Editor.

alter table days add column if not exists emergency_claims int not null default 0;

create or replace function emergency_claim_logger(p_day_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_pgy text;
  v_emergency_claims int;
begin
  select program_id, pgy, emergency_claims
  into v_program_id, v_pgy, v_emergency_claims
  from days
  where id = p_day_id
  for update;

  if v_program_id is null then
    raise exception 'Day not found';
  end if;
  if v_program_id <> my_program_id() or v_pgy <> my_pgy() then
    raise exception 'Not authorized for this day';
  end if;
  if v_emergency_claims >= 2 then
    raise exception 'Emergency claim limit reached for today';
  end if;

  update days
  set logger_id = auth.uid(), emergency_claims = emergency_claims + 1
  where id = p_day_id;
end;
$$;

grant execute on function emergency_claim_logger(uuid) to authenticated;

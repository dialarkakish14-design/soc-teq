-- Makes starting the 6-month remediation cycle a deliberate program-lead
-- action instead of something that silently auto-starts the moment any
-- resident happens to open the Cycle tab (the previous behavior). Only a
-- resident with role = 'program_lead' can now start it, via the new
-- start_remediation_cycle() function below.
--
-- Note: you (Diala) always have a way around this restriction regardless
-- of any resident's role, the same way you'd reset a program's data —
-- just run, directly in the SQL Editor:
--   insert into cycles (program_id, pgy, start_date) values ('<program_id>', '<pgy>', current_date);
-- Run this patch once in the Supabase SQL Editor.

drop policy if exists cycles_insert on cycles;

create or replace function start_remediation_cycle(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_role text;
begin
  select program_id, role into v_program_id, v_role from residents where id = auth.uid();
  if v_role <> 'program_lead' then
    raise exception 'Only a program lead can start the remediation cycle';
  end if;
  if exists (select 1 from cycles where program_id = v_program_id and pgy = p_pgy) then
    raise exception 'The remediation cycle has already started for this program year';
  end if;
  insert into cycles (program_id, pgy, start_date) values (v_program_id, p_pgy, current_date);
end;
$$;

grant execute on function start_remediation_cycle(text) to authenticated;

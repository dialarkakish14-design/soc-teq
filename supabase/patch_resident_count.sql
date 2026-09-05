-- Repurposes the unused "image resources" profile field into "number of
-- residents" instead, since image resources weren't referenced anywhere
-- in the app. Existing values (e.g. "Pending") carry over as-is under the
-- new column name.
-- Run this once in the Supabase SQL Editor.

alter table programs rename column image_resources to resident_count;

-- my_program has image_resources in the middle of its column list, and
-- Postgres only allows CREATE OR REPLACE VIEW to add columns at the very
-- end — renaming one in the middle needs a drop + recreate instead.
drop view my_program;

create view my_program with (security_invoker = false) as
  select id, name, profile_complete, setting, patient_mix, existing_curriculum, resident_count,
         profile_updated_at, location, timezone
  from programs
  where id = my_program_id();

grant select on my_program to authenticated;

-- Postgres won't let CREATE OR REPLACE rename a parameter (even with the
-- same type signature) — it has to be dropped first. Dropping it also
-- drops its grant, so that's re-issued below.
drop function if exists update_program_profile(text, text, text, text, text, text);

create or replace function update_program_profile(
  p_setting text,
  p_patient_mix text,
  p_existing_curriculum text,
  p_resident_count text,
  p_location text,
  p_timezone text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_program_id uuid;
begin
  select role, program_id into v_role, v_program_id from residents where id = auth.uid();

  if v_role is distinct from 'program_lead' then
    raise exception 'Only a program lead can edit the program profile';
  end if;

  if coalesce(trim(p_setting), '') = '' or coalesce(trim(p_patient_mix), '') = ''
     or coalesce(trim(p_existing_curriculum), '') = '' or coalesce(trim(p_resident_count), '') = ''
     or coalesce(trim(p_timezone), '') = '' then
    raise exception 'All four fields and a time zone are required';
  end if;

  update programs
  set setting = trim(p_setting),
      patient_mix = trim(p_patient_mix),
      existing_curriculum = trim(p_existing_curriculum),
      resident_count = trim(p_resident_count),
      location = nullif(trim(p_location), ''),
      timezone = trim(p_timezone),
      profile_updated_at = current_date,
      profile_complete = true
  where id = v_program_id;
end;
$$;

grant execute on function update_program_profile(text, text, text, text, text, text) to authenticated;

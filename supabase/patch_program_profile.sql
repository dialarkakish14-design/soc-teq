-- Program profile (Program Contextual Profile, build spec section 4/8) plus
-- a column-limited view so residents can read their own program's profile
-- without ever exposing access_code (build spec section 5, rule 6).
-- Run this once in the Supabase SQL Editor.

alter table programs
  add column setting text,
  add column patient_mix text,
  add column existing_curriculum text,
  add column image_resources text,
  add column profile_updated_at date;

-- Column-limited view of the caller's own program. Owned by the table
-- owner, same pattern as programs_public, so it bypasses the (policy-less)
-- RLS on the base table without ever exposing access_code.
create view my_program with (security_invoker = false) as
  select id, name, profile_complete, setting, patient_mix, existing_curriculum, image_resources, profile_updated_at
  from programs
  where id = my_program_id();

grant select on my_program to authenticated;

-- Program-lead-only profile edit. Security definer so it can update the
-- programs row directly (there is no update policy on programs at all,
-- deliberately — see the comment above the RLS section); checks the
-- caller's role itself rather than relying on RLS to gate it.
create or replace function update_program_profile(
  p_setting text,
  p_patient_mix text,
  p_existing_curriculum text,
  p_image_resources text
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
     or coalesce(trim(p_existing_curriculum), '') = '' or coalesce(trim(p_image_resources), '') = '' then
    raise exception 'All four fields are required';
  end if;

  update programs
  set setting = trim(p_setting),
      patient_mix = trim(p_patient_mix),
      existing_curriculum = trim(p_existing_curriculum),
      image_resources = trim(p_image_resources),
      profile_updated_at = current_date,
      profile_complete = true
  where id = v_program_id;
end;
$$;

grant execute on function update_program_profile(text, text, text, text) to authenticated;

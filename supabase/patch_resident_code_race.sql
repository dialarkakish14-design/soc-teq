-- Patch: serialize resident_code assignment so two residents signing up in
-- the same instant, in the same program + PGY, can't collide on the same
-- code. Safe to run anytime — replaces the function, touches no data.

create or replace function complete_signup(
  p_program_id uuid,
  p_pgy text,
  p_full_name text,
  p_username text,
  p_access_code text,
  p_precourse boolean
)
returns residents
language plpgsql security definer set search_path = public as $$
declare
  v_program programs;
  v_username text := lower(trim(p_username));
  v_count int;
  v_code text;
  v_resident residents;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from residents where id = auth.uid()) then
    raise exception 'A profile already exists for this account';
  end if;

  if p_pgy not in ('PGY-2', 'PGY-3', 'PGY-4') then
    raise exception 'Invalid PGY level';
  end if;

  if not p_precourse then
    raise exception 'Confirm the pre-course before joining';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,}$' then
    raise exception 'Pick a username of at least 3 characters, letters and numbers only';
  end if;

  if exists (select 1 from residents where username = v_username) then
    raise exception 'That username is taken';
  end if;

  select * into v_program from programs where id = p_program_id;
  if v_program is null or not v_program.profile_complete then
    raise exception 'That program is not accepting sign-ups';
  end if;

  if upper(trim(p_access_code)) <> upper(trim(v_program.access_code)) then
    raise exception 'That access code does not match';
  end if;

  -- Serialize resident_code assignment per (program, pgy) so two residents
  -- signing up in the same instant can't both read the same count and land
  -- on the same code. Held for the rest of this transaction, then released
  -- automatically when the function returns.
  perform pg_advisory_xact_lock(hashtextextended(p_program_id::text || ':' || p_pgy, 0));

  select count(*) into v_count from residents where program_id = p_program_id and pgy = p_pgy;
  v_code := 'Resident ' || chr(65 + v_count);

  insert into residents (id, program_id, pgy, full_name, email, username, resident_code, precourse_confirmed)
  values (
    auth.uid(),
    p_program_id,
    p_pgy,
    trim(p_full_name),
    (select email from auth.users where id = auth.uid()),
    v_username,
    v_code,
    p_precourse
  )
  returning * into v_resident;

  return v_resident;
end;
$$;

grant execute on function complete_signup(uuid, text, text, text, text, boolean) to authenticated;

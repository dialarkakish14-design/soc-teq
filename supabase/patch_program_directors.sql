-- Program Director accounts: a separate identity from residents, tied to
-- a program (not a PGY), signing up with its own access code so the two
-- populations can't cross into each other's signup flow. Stage 1 of the
-- PD dashboard -- this gets accounts/login working end to end; the
-- dashboard content itself (cross-PGY results, exports, materials
-- browsing) is a separate patch. Run this once in the Supabase SQL
-- Editor.

alter table programs add column if not exists pd_access_code text;

create table if not exists program_directors (
  id uuid primary key references auth.users (id) on delete cascade,
  program_id uuid not null references programs (id),
  full_name text not null,
  email text not null,
  -- Same username-based login as residents share one Login screen, so a
  -- PD needs a username too, unique across both tables (checked in
  -- complete_pd_signup below, since two separate unique constraints
  -- don't prevent the same username existing once in each table).
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table program_directors enable row level security;

create policy program_directors_select on program_directors for select
  using (id = auth.uid());

-- Mirrors my_program_id()/my_pgy() for the PD side -- used by the
-- cross-PGY dashboard functions in the next stage.
create or replace function my_pd_program_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select program_id from program_directors where id = auth.uid();
$$;

-- Now checks both account types, since login is one shared screen for
-- residents and program directors alike.
create or replace function get_email_for_username(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select email from residents where username = lower(trim(p_username))
  union all
  select email from program_directors where username = lower(trim(p_username))
  limit 1;
$$;

-- Validates the PD access code server-side and creates the
-- program_directors row -- mirrors complete_signup()'s shape closely.
create or replace function complete_pd_signup(
  p_program_id uuid,
  p_full_name text,
  p_username text,
  p_access_code text
)
returns program_directors
language plpgsql security definer set search_path = public as $$
declare
  v_program programs;
  v_username text := lower(trim(p_username));
  v_pd program_directors;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from residents where id = auth.uid())
    or exists (select 1 from program_directors where id = auth.uid()) then
    raise exception 'A profile already exists for this account';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,}$' then
    raise exception 'Pick a username of at least 3 characters, letters and numbers only';
  end if;

  if exists (select 1 from residents where username = v_username)
    or exists (select 1 from program_directors where username = v_username) then
    raise exception 'That username is taken';
  end if;

  select * into v_program from programs where id = p_program_id;
  if v_program is null or not v_program.profile_complete then
    raise exception 'That program is not accepting sign-ups';
  end if;

  if v_program.pd_access_code is null or trim(v_program.pd_access_code) = '' then
    raise exception 'This program has not enabled program director sign-ups yet';
  end if;

  if upper(trim(p_access_code)) <> upper(trim(v_program.pd_access_code)) then
    raise exception 'That access code does not match';
  end if;

  insert into program_directors (id, program_id, full_name, email, username)
  values (
    auth.uid(),
    p_program_id,
    trim(p_full_name),
    (select email from auth.users where id = auth.uid()),
    v_username
  )
  returning * into v_pd;

  return v_pd;
end;
$$;

grant execute on function complete_pd_signup(uuid, text, text, text) to authenticated;

-- Set a program's PD access code to enable PD sign-ups for it, e.g.:
--   update programs set pd_access_code = 'WSUDERM2026PD' where name = 'Wayne State University — Dermatology';

-- SoC-TEQ — core loop schema (build spec section 10)
-- Run this once in the Supabase SQL Editor for your project.
-- Creates only the tables the core loop needs: programs, residents, days,
-- sessions, topics, ratings — each with RLS enforced in Postgres.

create extension if not exists pgcrypto;

-- ---------- tables ----------

create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null,
  profile_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table residents (
  id uuid primary key references auth.users (id) on delete cascade,
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  full_name text not null,
  email text not null,
  username text not null unique,
  resident_code text not null,
  role text not null default 'resident' check (role in ('resident', 'program_lead')),
  precourse_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  date date not null,
  logger_id uuid references residents (id),
  unique (program_id, pgy, date)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references days (id) on delete cascade,
  type text not null check (
    type in ('Lecture', 'Didactic', 'Grand round', 'Clinic outpatient', 'Clinic inpatient', 'Journal club', 'Tumor board')
  ),
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  title text not null,
  incomplete boolean not null default true,
  image_soc boolean,
  discussed_soc boolean,
  soc_covered boolean generated always as (coalesce(image_soc, false) and coalesce(discussed_soc, false)) stored,
  skin_type text check (
    skin_type is null or skin_type in ('Fitzpatrick IV', 'Fitzpatrick V', 'Fitzpatrick VI', 'Mixed across IV–VI', 'Not specified')
  ),
  created_at timestamptz not null default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  depth int not null check (depth between 1 and 5),
  clarity int not null check (clarity between 1 and 5),
  nuance int not null check (nuance between 1 and 5),
  mgmt int not null check (mgmt between 1 and 5),
  conf int not null check (conf between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (topic_id, resident_id)
);

-- ---------- helper functions ----------
-- Security definer so they can read the caller's own residents row without
-- RLS on `residents` recursing back through the policy that calls them.

create or replace function my_program_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select program_id from residents where id = auth.uid();
$$;

create or replace function my_pgy()
returns text
language sql stable security definer set search_path = public as $$
  select pgy from residents where id = auth.uid();
$$;

-- Ratings for a day are open until 04:00 the following morning, Wayne State
-- local time, then permanently locked (build spec section 6).
create or replace function is_day_open(d date)
returns boolean
language sql stable as $$
  select now() < ((d + 1)::timestamp + time '04:00') at time zone 'America/Detroit';
$$;

-- ---------- row level security ----------

alter table programs enable row level security;
alter table residents enable row level security;
alter table days enable row level security;
alter table sessions enable row level security;
alter table topics enable row level security;
alter table ratings enable row level security;

-- programs: no direct policies. access_code must never be readable by
-- clients — signup goes through complete_signup() below, and the program
-- picker on the signup screen reads the programs_public view instead.

-- residents: read your own row, or any row in your own program + PGY cohort
-- (needed to show the logger's name). No insert/update policy — the only
-- way to create a residents row is the complete_signup() function.
create policy residents_select on residents for select
  using (id = auth.uid() or (program_id = my_program_id() and pgy = my_pgy()));

-- days: cohort-scoped read/create. Claiming the logger is an update that's
-- only allowed while unclaimed (or already yours), and always sets you as
-- the logger — never someone else.
create policy days_select on days for select
  using (program_id = my_program_id() and pgy = my_pgy());

create policy days_insert on days for insert
  with check (program_id = my_program_id() and pgy = my_pgy());

create policy days_update on days for update
  using (
    program_id = my_program_id() and pgy = my_pgy()
    and (logger_id is null or logger_id = auth.uid())
  )
  with check (program_id = my_program_id() and pgy = my_pgy() and logger_id = auth.uid());

-- sessions: cohort-scoped read. Only the day's logger may create/edit them,
-- and only while the day is still open.
create policy sessions_select on sessions for select
  using (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy sessions_insert on sessions for insert
  with check (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

create policy sessions_update on sessions for update
  using (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

create policy sessions_delete on sessions for delete
  using (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

-- topics: cohort-scoped read. Only the day's logger may create/edit/delete,
-- and only while the day is open (build spec section 5, rule 2 and section 6).
create policy topics_select on topics for select
  using (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy topics_insert on topics for insert
  with check (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

create policy topics_update on topics for update
  using (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

create policy topics_delete on topics for delete
  using (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date)
    )
  );

-- ratings: cohort-scoped read (so the team score can be computed by anyone
-- in the cohort). A resident may only write their own rating row, only on a
-- SoC-covered topic, and only while the day is open (build spec section 5,
-- rule 3, and section 6).
create policy ratings_select on ratings for select
  using (
    exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = ratings.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy ratings_insert on ratings for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = ratings.topic_id and t.soc_covered = true
        and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date)
    )
  );

create policy ratings_update on ratings for update
  using (resident_id = auth.uid())
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = ratings.topic_id and is_day_open(d.date)
    )
  );

-- ---------- signup path ----------

-- Public, column-limited view of programs for the signup dropdown. Owned by
-- the table owner (postgres), which bypasses the (policy-less) RLS on the
-- base table, so it can expose id/name without ever exposing access_code.
create view programs_public with (security_invoker = false) as
  select id, name from programs where profile_complete = true;

grant select on programs_public to anon, authenticated;

-- Looks up the email for a username so the login screen can authenticate by
-- username while Supabase Auth itself keys off email. Never reveals which
-- usernames exist beyond a plain match, and the login screen shows no hints.
create or replace function get_email_for_username(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select email from residents where username = lower(trim(p_username));
$$;

grant execute on function get_email_for_username(text) to anon, authenticated;

-- Validates the access code server-side and creates the residents row.
-- access_code itself is never sent back to the client at any point.
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

-- ---------- seed: the Wayne State pilot program ----------

insert into programs (name, access_code, profile_complete)
values ('Wayne State University — Dermatology', 'WSUDERM2026', true);

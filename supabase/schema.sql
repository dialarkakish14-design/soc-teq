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
  setting text,
  patient_mix text,
  existing_curriculum text,
  resident_count text,
  location text,
  timezone text not null default 'America/Detroit',
  profile_updated_at date,
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
  -- Optional email reminder before a day's 4am close — see
  -- supabase/patch_reminders.sql for the full commentary.
  reminder_enabled boolean not null default false,
  reminder_hours_before smallint check (reminder_hours_before is null or reminder_hours_before in (1, 3)),
  created_at timestamptz not null default now()
);

create table days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  date date not null,
  logger_id uuid references residents (id),
  -- How many times emergency_claim_logger() has taken the logger role over
  -- on this day, regardless of who did it or how many times it's since been
  -- released normally — caps the emergency path at 2 uses per day so it
  -- stays a rare override, not a routine way to switch loggers.
  emergency_claims int not null default 0,
  unique (program_id, pgy, date)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references days (id) on delete cascade,
  type text not null check (
    type in (
      'Lecture / structured didactic', 'Grand rounds', 'Journal club', 'Case conference / unknowns',
      'Tumor board / multidisciplinary conference', 'Dermatopathology teaching / sign-out',
      'Workshop / skills lab', 'Outpatient clinic', 'Inpatient / consult service', 'Other teaching session'
    )
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
  -- Set by the logger (with the room) when an entire area of clinical
  -- teaching was genuinely outside this session's scope — not simply
  -- because skin-of-color considerations within it went uncovered. Only
  -- nuance and management are excludable; see patch_scope_exclusion.sql.
  nuance_applicable boolean not null default true,
  nuance_scope_reason text,
  mgmt_applicable boolean not null default true,
  mgmt_scope_reason text,
  created_at timestamptz not null default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  depth int not null check (depth between 1 and 5),
  clarity int not null check (clarity between 1 and 5),
  -- Nullable: left unset when the topic's nuance/mgmt was marked outside
  -- the session's scope, so it's structurally absent rather than a 0 or a
  -- forced numeric answer to a question that didn't apply.
  nuance int check (nuance between 1 and 5),
  mgmt int check (mgmt between 1 and 5),
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

-- Ratings for a day are open until 04:00 the following morning, in that
-- program's own local time zone (not a single hardcoded one — programs can
-- be anywhere in the world), then permanently locked (build spec section 6).
-- security definer so it can read programs.timezone even though the
-- programs table has no select policy for ordinary residents (same
-- reason my_program_id() and my_pgy() above are security definer).
create or replace function is_day_open(d date, p_program_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select now() < ((d + 1)::timestamp + time '04:00') at time zone (
    select timezone from programs where id = p_program_id
  );
$$;

-- Lets a cohort member forcibly become the logger even though days_update's
-- RLS only allows the current logger (or nobody) to change logger_id -
-- covers the case where the actual logger forgot to release and is
-- unreachable. security definer to bypass that policy deliberately, with
-- its own program/pgy check standing in for it, plus a hard cap of 2 uses
-- per day (tracked in days.emergency_claims) so this stays a rare override.
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

-- Also allows releasing a claim (logger_id back to null) so someone else
-- can pick it up mid-day — only the current logger (or an unclaimed day)
-- ever reaches this branch at all, per the USING clause above.
create policy days_update on days for update
  using (
    program_id = my_program_id() and pgy = my_pgy()
    and (logger_id is null or logger_id = auth.uid())
  )
  with check (
    program_id = my_program_id() and pgy = my_pgy()
    and (logger_id = auth.uid() or logger_id is null)
  );

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
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
    )
  );

create policy sessions_update on sessions for update
  using (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
    )
  );

create policy sessions_delete on sessions for delete
  using (
    exists (
      select 1 from days d
      where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
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
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
    )
  );

create policy topics_update on topics for update
  using (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
    )
  );

create policy topics_delete on topics for delete
  using (
    exists (
      select 1 from sessions s join days d on d.id = s.day_id
      where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
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
        and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date, d.program_id)
    )
  );

create policy ratings_update on ratings for update
  using (resident_id = auth.uid())
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = ratings.topic_id and is_day_open(d.date, d.program_id)
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

-- ---------- absences + the 4am close job ----------
-- See supabase/patch_absences_close_job.sql for the full commentary; this
-- mirrors it so a fresh deploy doesn't need the patch file separately.

alter table days add column if not exists closed_at timestamptz;

create table absences (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  reason text not null check (reason in ('declared', 'no_response')),
  created_at timestamptz not null default now(),
  unique (topic_id, resident_id)
);

alter table absences enable row level security;

create policy absences_select on absences for select
  using (
    exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy absences_insert on absences for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and t.soc_covered = true
        and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date, d.program_id)
    )
  );

create policy absences_delete on absences for delete
  using (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = absences.topic_id and is_day_open(d.date, d.program_id)
    )
  );

create or replace function close_finished_days()
returns void
language plpgsql security definer set search_path = public as $$
declare
  d record;
begin
  for d in
    select * from days
    where closed_at is null and not is_day_open(date, program_id)
  loop
    insert into absences (topic_id, resident_id, reason)
    select t.id, r.id, 'no_response'
    from sessions s
    join topics t on t.session_id = s.id and t.soc_covered = true
    cross join residents r
    where s.day_id = d.id
      and r.program_id = d.program_id
      and r.pgy = d.pgy
      and not exists (select 1 from ratings ra where ra.topic_id = t.id and ra.resident_id = r.id)
      and not exists (select 1 from absences ab where ab.topic_id = t.id and ab.resident_id = r.id)
    on conflict (topic_id, resident_id) do nothing;

    update days set closed_at = now() where id = d.id;
  end loop;
end;
$$;

-- Schedule separately after enabling pg_cron (Database -> Extensions):
--   select cron.schedule('close-finished-days', '*/15 * * * *', 'select close_finished_days()');

-- ---------- reminders ----------
-- See supabase/patch_reminders.sql for the full commentary. Sending itself
-- happens in the send-reminders Edge Function, invoked by pg_cron.

create table reminder_log (
  day_id uuid not null references days (id) on delete cascade,
  resident_id uuid not null references residents (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (day_id, resident_id)
);

alter table reminder_log enable row level security;

create or replace function update_reminder_preference(p_enabled boolean, p_hours_before smallint)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_enabled and p_hours_before not in (1, 3) then
    raise exception 'Invalid reminder offset';
  end if;
  update residents
  set reminder_enabled = p_enabled,
      reminder_hours_before = case when p_enabled then p_hours_before else null end
  where id = auth.uid();
end;
$$;

grant execute on function update_reminder_preference(boolean, smallint) to authenticated;

create or replace function reminder_candidates()
returns table (
  day_id uuid,
  resident_id uuid,
  email text,
  full_name text,
  minutes_until_close numeric
)
language sql stable security definer set search_path = public as $$
  select
    d.id,
    r.id,
    r.email,
    r.full_name,
    extract(epoch from (((d.date + 1)::timestamp + time '04:00') at time zone p.timezone - now())) / 60.0
  from days d
  join programs p on p.id = d.program_id
  join residents r on r.program_id = d.program_id and r.pgy = d.pgy
  where r.reminder_enabled
    and is_day_open(d.date, d.program_id)
    and not exists (select 1 from reminder_log rl where rl.day_id = d.id and rl.resident_id = r.id)
    and abs(
      extract(epoch from (((d.date + 1)::timestamp + time '04:00') at time zone p.timezone - now())) / 60.0
      - r.reminder_hours_before * 60
    ) <= 7.5
    and exists (
      select 1
      from sessions s
      join topics t on t.session_id = s.id
      where s.day_id = d.id
        and t.soc_covered
        and not exists (select 1 from ratings rt where rt.topic_id = t.id and rt.resident_id = r.id)
        and not exists (select 1 from absences ab where ab.topic_id = t.id and ab.resident_id = r.id)
    );
$$;

revoke all on function reminder_candidates() from public, anon, authenticated;
grant execute on function reminder_candidates() to service_role;

create or replace function record_reminder_sent(p_day_id uuid, p_resident_id uuid)
returns void
language sql security definer set search_path = public as $$
  insert into reminder_log (day_id, resident_id) values (p_day_id, p_resident_id)
  on conflict (day_id, resident_id) do nothing;
$$;

revoke all on function record_reminder_sent(uuid, uuid) from public, anon, authenticated;
grant execute on function record_reminder_sent(uuid, uuid) to service_role;

-- Schedule separately after enabling pg_cron and pg_net (Database -> Extensions):
--   select cron.schedule(
--     'send-reminders',
--     '*/15 * * * *',
--     $$
--     select net.http_post(
--       url := 'https://hnkckozojgdtizufanmz.supabase.co/functions/v1/send-reminders',
--       headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--       body := '{}'::jsonb
--     );
--     $$
--   );

-- ---------- remediation cycle ----------
-- See supabase/patch_remediation_cycle.sql for the full commentary.

create table cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  start_date date not null,
  unique (program_id, pgy)
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles (id) on delete cascade,
  resident_id uuid not null references residents (id),
  topic_title text not null,
  format text not null check (format in ('Peer-teaching module', 'SoC journal club', 'Digital repository case set')),
  status text not null default 'planned' check (status in ('planned', 'delivered')),
  scholarly boolean not null default false,
  created_at timestamptz not null default now()
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles (id) on delete cascade,
  resident_id uuid not null references residents (id),
  phase text not null check (phase in ('baseline', 'followup')),
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (cycle_id, resident_id, phase)
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  topic_title text not null,
  resident_id uuid not null references residents (id),
  source text not null,
  url text,
  takeaway text not null,
  created_at timestamptz not null default now()
);

alter table cycles enable row level security;
alter table claims enable row level security;
alter table assessments enable row level security;
alter table resources enable row level security;

create policy cycles_select on cycles for select
  using (program_id = my_program_id() and pgy = my_pgy());

create policy cycles_insert on cycles for insert
  with check (program_id = my_program_id() and pgy = my_pgy());

create policy claims_select on claims for select
  using (
    exists (select 1 from cycles c where c.id = claims.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy claims_insert on claims for insert
  with check (
    resident_id = auth.uid()
    and exists (select 1 from cycles c where c.id = claims.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy claims_update on claims for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

create policy claims_delete on claims for delete
  using (resident_id = auth.uid());

create policy assessments_select on assessments for select
  using (
    exists (select 1 from cycles c where c.id = assessments.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy assessments_insert on assessments for insert
  with check (
    resident_id = auth.uid()
    and exists (select 1 from cycles c where c.id = assessments.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy resources_select on resources for select
  using (program_id = my_program_id() and pgy = my_pgy());

create policy resources_insert on resources for insert
  with check (resident_id = auth.uid() and program_id = my_program_id() and pgy = my_pgy());

-- ---------- program profile ----------
-- See supabase/patch_program_profile.sql for the full commentary.

-- Column-limited view of the caller's own program. Owned by the table
-- owner, same pattern as programs_public, so it bypasses the (policy-less)
-- RLS on the base table without ever exposing access_code.
create view my_program with (security_invoker = false) as
  select id, name, profile_complete, setting, patient_mix, existing_curriculum, resident_count,
         profile_updated_at, location, timezone
  from programs
  where id = my_program_id();

grant select on my_program to authenticated;

-- Program-lead-only profile edit. Security definer so it can update the
-- programs row directly (there is no update policy on programs at all,
-- deliberately — see the comment above the RLS section); checks the
-- caller's role itself rather than relying on RLS to gate it.
-- location and timezone were added later (patch_program_timezone.sql) —
-- timezone is required (it drives is_day_open's cutoff), location is
-- informational only and left optional. image_resources was later
-- repurposed as resident_count (patch_resident_count.sql) since image
-- resources weren't used anywhere in the app.
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

-- ---------- feedback ----------
-- See supabase/patch_feedback.sql for the full commentary.

create table feedback (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents (id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy feedback_insert on feedback for insert
  with check (resident_id = auth.uid());

-- ---------- private notes ----------
-- See supabase/patch_private_notes.sql for the full commentary.

create table private_notes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  note text not null,
  updated_at timestamptz not null default now(),
  unique (topic_id, resident_id)
);

alter table private_notes enable row level security;

create policy private_notes_select on private_notes for select
  using (resident_id = auth.uid());

create policy private_notes_insert on private_notes for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = private_notes.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy private_notes_update on private_notes for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

create policy private_notes_delete on private_notes for delete
  using (resident_id = auth.uid());

-- ---------- admin utilities ----------
-- See supabase/patch_reset_program_data.sql for the full commentary. Not
-- reachable from the app or by any resident — only callable directly in
-- the Supabase SQL Editor (which runs as the postgres superuser and
-- bypasses grants).

create or replace function reset_program_data(p_program_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from days where program_id = p_program_id;
  delete from cycles where program_id = p_program_id;
  delete from resources where program_id = p_program_id;
end;
$$;

revoke all on function reset_program_data(uuid) from public, anon, authenticated, service_role;

-- ---------- seed: the Wayne State pilot program ----------

insert into programs (name, access_code, profile_complete)
values ('Wayne State University — Dermatology', 'WSUDERM2026', true);

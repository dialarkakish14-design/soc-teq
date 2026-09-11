-- Optional email reminders: a resident can opt in to get an email 1 or 3
-- hours before their day's 4am close, but only if they still have an
-- unrated covered topic waiting on them at send time. Sending itself is
-- done by a separate Edge Function (supabase/functions/send-reminders),
-- invoked on a schedule by pg_cron — this patch only adds the preference
-- columns, the dedup log, and the security-definer functions it needs.
-- Run this once in the Supabase SQL Editor.

alter table residents add column if not exists reminder_enabled boolean not null default false;
alter table residents add column if not exists reminder_hours_before smallint
  check (reminder_hours_before is null or reminder_hours_before in (1, 3));

-- Lets a resident change their own reminder preference. Needed because
-- residents has no update policy at all (see residents_select in
-- schema.sql) — everything that lets a resident touch their own row goes
-- through a security-definer function like this one instead.
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

-- One row per (day, resident) reminder actually sent, so send-reminders
-- never double-emails someone across two 15-minute cron ticks. RLS is on
-- with no policies at all — nothing here is meant to be readable or
-- writable by residents directly, only by the service role via the
-- functions below.
create table if not exists reminder_log (
  day_id uuid not null references days (id) on delete cascade,
  resident_id uuid not null references residents (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (day_id, resident_id)
);

alter table reminder_log enable row level security;

-- Finds everyone due a reminder right now: reminders are on, their day is
-- still open, it's within 7.5 minutes of their chosen hours-before-close
-- offset (matching the 15-minute cron cadence), nothing's been sent for
-- this day+resident yet, and they still have at least one covered topic
-- they haven't rated or declared. Security definer + granted only to
-- service_role, since this reaches across every resident's data at once —
-- nothing an ordinary authenticated resident should be able to call.
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

-- Records that a reminder was sent, so it isn't sent again. Called by the
-- Edge Function right after a successful send. Same access restriction as
-- reminder_candidates() above.
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
-- Replace <CRON_SECRET> with the same value set as the send-reminders
-- function's CRON_SECRET secret — see the deployment steps you'll be given
-- alongside this file.

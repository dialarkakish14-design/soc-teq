-- One-time "6 months are up, begin impact evaluation" email to every
-- resident in a cohort once their cycle crosses day 180. Sending itself
-- is done by a separate Edge Function (supabase/functions/send-phase4-
-- reminders), invoked daily by pg_cron -- this patch only adds the dedup
-- flag and the security-definer functions it needs. Run this once in the
-- Supabase SQL Editor.

alter table cycles add column if not exists phase4_reminder_sent_at timestamptz;

-- Every cycle that just crossed the 6-month mark, hasn't started impact
-- evaluation yet, and hasn't already had this reminder sent -- joined out
-- to every resident in that cohort. Security definer + granted only to
-- service_role, since this reaches across every resident's data at once.
create or replace function phase4_reminder_candidates()
returns table (
  cycle_id uuid,
  resident_id uuid,
  email text,
  full_name text
)
language sql stable security definer set search_path = public as $$
  select c.id, r.id, r.email, r.full_name
  from cycles c
  join residents r on r.program_id = c.program_id and r.pgy = c.pgy
  where c.phase3_started_at is not null
    and c.phase4_started_at is null
    and c.phase4_reminder_sent_at is null
    and c.start_date + 180 <= current_date;
$$;

revoke all on function phase4_reminder_candidates() from public, anon, authenticated;
grant execute on function phase4_reminder_candidates() to service_role;

-- Marks a cycle as reminded so it's never sent twice. Called once per
-- cycle per run, after attempting every resident in it -- a best-effort
-- broadcast, not a per-resident guarantee, since the in-app note already
-- covers anyone who happens to miss the email.
create or replace function record_phase4_reminder_sent(p_cycle_id uuid)
returns void
language sql security definer set search_path = public as $$
  update cycles set phase4_reminder_sent_at = now() where id = p_cycle_id;
$$;

revoke all on function record_phase4_reminder_sent(uuid) from public, anon, authenticated;
grant execute on function record_phase4_reminder_sent(uuid) to service_role;

-- Schedule separately, after deploying the send-phase4-reminders function.
-- It needs its own PHASE4_CRON_SECRET secret (deliberately separate from
-- send-reminders' CRON_SECRET, so setting this one up can't break the
-- other's already-scheduled job) plus BREVO_API_KEY, which it already
-- gets for free since that's a project-wide secret. Once a day is plenty
-- here -- this only depends on a date threshold, not anything
-- time-sensitive within the day.
--   select cron.schedule(
--     'send-phase4-reminders',
--     '0 6 * * *',
--     $$
--     select net.http_post(
--       url := 'https://hnkckozojgdtizufanmz.supabase.co/functions/v1/<actual-function-url>',
--       headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<PHASE4_CRON_SECRET>'),
--       body := '{}'::jsonb
--     );
--     $$
--   );
-- Replace <actual-function-url> with whatever slug Supabase assigned the
-- function (check its URL on the Edge Functions page), and
-- <PHASE4_CRON_SECRET> with the value you set for the new secret.

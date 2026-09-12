-- Foreign key columns don't automatically get an index in Postgres, and
-- get_cycle_dashboard() (the Cycle tab's one-call loader) joins across
-- exactly these ones every time it runs: topics -> sessions -> days
-- (filtered by program_id/pgy), plus ratings, claims, assessments, and
-- resources. Without indexes on them, those joins fall back to scanning
-- whole tables, which gets slower as more topics/ratings/claims pile up
-- from testing — this is very likely why the Cycle tab has felt slower
-- to open again. Safe to run any time; purely additive, no data changes.
-- Run this once in the Supabase SQL Editor.

create index if not exists idx_days_program_pgy on days (program_id, pgy);
create index if not exists idx_sessions_day_id on sessions (day_id);
create index if not exists idx_topics_session_id on topics (session_id);
create index if not exists idx_ratings_topic_id on ratings (topic_id);
create index if not exists idx_absences_topic_id on absences (topic_id);
create index if not exists idx_claims_cycle_id on claims (cycle_id);
create index if not exists idx_assessments_cycle_id on assessments (cycle_id);
create index if not exists idx_resources_program_pgy on resources (program_id, pgy);
create index if not exists idx_residents_program_pgy on residents (program_id, pgy);

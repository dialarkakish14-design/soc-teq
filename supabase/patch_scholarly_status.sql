-- Once a claim is marked as scholarly work, the resident can note where
-- it actually stands: any combination of Completed, Published, Submitted,
-- Pending work — not mutually exclusive (e.g. "Submitted" and "Pending
-- work" can both be true at once). Run this once in the Supabase SQL
-- Editor.

alter table claims add column if not exists scholarly_status text[] not null default '{}';

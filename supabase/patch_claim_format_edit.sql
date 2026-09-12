-- Lets a resident change the teaching format they chose for a claimed
-- topic exactly once (a change of plans, e.g. a journal club instead of
-- a peer-teaching module) — after that one edit, the option disappears.
-- The existing claims_update RLS policy (resident_id = auth.uid()) already
-- covers this column, so no policy change is needed here.
-- Run this once in the Supabase SQL Editor.

alter table claims add column if not exists format_edited boolean not null default false;

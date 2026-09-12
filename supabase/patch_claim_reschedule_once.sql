-- After a claim is missed (its scheduled date passed without being marked
-- delivered), the resident gets exactly one reschedule to try again — not
-- unlimited retries. This column tracks whether that one redo has
-- already been used; the app sets it the first time someone reschedules
-- a missed claim. Run this once in the Supabase SQL Editor.

alter table claims add column if not exists rescheduled boolean not null default false;

-- Optional "when and where" for a claimed topic, so the rest of the
-- cohort can see it too, not just the resident who claimed it. Filled in
-- (or left blank) at claim time in Phase 2, editable later in Phase 3 as
-- plans firm up. Run this once in the Supabase SQL Editor.

alter table claims add column if not exists deliver_date date;
alter table claims add column if not exists deliver_location text;

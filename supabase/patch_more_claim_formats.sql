-- Claims are no longer restricted to a fixed list of teaching formats —
-- the app now also offers "Other", where a resident types their own
-- format. The database just requires non-empty text instead of an enum.
-- Run this once in the Supabase SQL Editor. Supersedes any earlier version
-- of this file that added a fixed 5-value enum.

alter table claims drop constraint if exists claims_format_check;

alter table claims add constraint claims_format_check check (length(trim(format)) > 0);

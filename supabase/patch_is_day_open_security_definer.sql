-- Fixes is_day_open() blocking every write (capturing topics, rating,
-- claiming logger releases, etc.) since the timezone patch. It reads
-- programs.timezone, but programs has no select policy for ordinary
-- residents, and this function wasn't marked security definer — so the
-- lookup silently returned nothing and every day appeared closed.
-- Run this once in the Supabase SQL Editor.

create or replace function is_day_open(d date, p_program_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select now() < ((d + 1)::timestamp + time '04:00') at time zone (
    select timezone from programs where id = p_program_id
  );
$$;

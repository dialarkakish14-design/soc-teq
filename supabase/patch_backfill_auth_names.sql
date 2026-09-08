-- One-time backfill: mirrors each existing resident's full_name and username
-- into auth.users.raw_user_meta_data, so Supabase's built-in auth emails
-- (password reset, etc.) can reference {{ .Data.full_name }} / {{ .Data.username }} —
-- login is by username, so a reset email doubles as a resident's reminder of it.
-- New signups get this automatically going forward from the app itself — this
-- just catches everyone who joined before that code existed. Safe to re-run.

update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('full_name', r.full_name, 'username', r.username)
from residents r
where r.id = u.id;

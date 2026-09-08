-- One-time backfill: mirrors each existing resident's full_name into
-- auth.users.raw_user_meta_data, so Supabase's built-in auth emails
-- (password reset, etc.) can reference {{ .Data.full_name }}. New signups
-- get this automatically going forward from the app itself — this just
-- catches everyone who joined before that code existed.
-- Run this once in the Supabase SQL Editor.

update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', r.full_name)
from residents r
where r.id = u.id;

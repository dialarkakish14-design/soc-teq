-- Free-text feedback residents can send from the FAQ screen. Insert-only —
-- no select policy, so only the project owner (via the Supabase dashboard,
-- which bypasses RLS) can read submissions. Residents can't read anyone's
-- feedback back through the app, including their own.
-- Run this once in the Supabase SQL Editor.

create table feedback (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents (id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy feedback_insert on feedback for insert
  with check (resident_id = auth.uid());

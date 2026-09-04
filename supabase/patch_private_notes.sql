-- Personal, per-topic notes visible only to the resident who wrote them —
-- distinct from the rating note, which every cohort member can see.
-- Run this once in the Supabase SQL Editor.

create table private_notes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  resident_id uuid not null references residents (id),
  note text not null,
  updated_at timestamptz not null default now(),
  unique (topic_id, resident_id)
);

alter table private_notes enable row level security;

-- Read/write your own notes only — never another resident's, even within
-- the same cohort.
create policy private_notes_select on private_notes for select
  using (resident_id = auth.uid());

create policy private_notes_insert on private_notes for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = private_notes.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

create policy private_notes_update on private_notes for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

create policy private_notes_delete on private_notes for delete
  using (resident_id = auth.uid());

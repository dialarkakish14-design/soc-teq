-- Lets a resident attach an actual file (a PDF, or a screenshot of one)
-- to a shared paper/note under a claimed topic, instead of only a
-- source name + link. Files live in a private Storage bucket, scoped by
-- path to program_id/pgy the same way every other table already is —
-- only residents in the same program and PGY year can read or upload to
-- their own folder. Run this once in the Supabase SQL Editor.

alter table resources add column if not exists file_path text;
alter table resources add column if not exists file_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-papers', 'resource-papers', false, 20971520,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths are stored as "<program_id>/<pgy>/<filename>" — these policies
-- check the first two folder segments against the caller's own
-- program/pgy, same pattern used for every other program-scoped table.
create policy resource_papers_select on storage.objects for select
  using (
    bucket_id = 'resource-papers'
    and (storage.foldername(name))[1] = my_program_id()::text
    and (storage.foldername(name))[2] = my_pgy()
  );

create policy resource_papers_insert on storage.objects for insert
  with check (
    bucket_id = 'resource-papers'
    and (storage.foldername(name))[1] = my_program_id()::text
    and (storage.foldername(name))[2] = my_pgy()
  );

-- Lets a resident edit a shared paper/note they added themselves (source,
-- link, takeaway, or replace the uploaded file) — there was only
-- select/insert/delete on resources before this, no update. Run this once
-- in the Supabase SQL Editor.

create policy resources_update on resources for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

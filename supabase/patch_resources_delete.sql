-- Lets a resident delete a shared paper/note they added themselves — there
-- was no delete policy on resources at all before this. Run this once in
-- the Supabase SQL Editor.

create policy resources_delete on resources for delete
  using (resident_id = auth.uid());

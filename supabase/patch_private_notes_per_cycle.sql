-- private_notes_select had no join back to days at all, unlike every
-- other RLS policy touched by patch_days_per_cycle.sql -- it only checked
-- note ownership, so a resident's private notes from a finished cycle
-- kept showing up in Summary's "My private notes" after a new cycle
-- started. Run this once in the Supabase SQL Editor, after
-- patch_days_per_cycle.sql.

drop policy if exists private_notes_select on private_notes;
create policy private_notes_select on private_notes for select
  using (
    resident_id = auth.uid()
    and exists (
      select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
      where t.id = private_notes.topic_id and d.program_id = my_program_id() and d.pgy = my_pgy()
    )
  );

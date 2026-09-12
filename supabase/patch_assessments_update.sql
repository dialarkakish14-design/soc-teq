-- Lets a resident correct their own baseline/follow-up assessment score
-- after submitting it (e.g. a typo, or the grade was re-corrected) —
-- there was no update policy on assessments at all before this. Run this
-- once in the Supabase SQL Editor.

create policy assessments_update on assessments for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

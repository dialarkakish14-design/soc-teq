-- Once a resident has entered their baseline assessment score, they can
-- no longer release a claimed topic — their claimed set is effectively
-- locked in at that point, since the baseline reflects what they're
-- committed to. Enforced here (not just hidden in the UI) so it can't be
-- bypassed. Run this once in the Supabase SQL Editor.

drop policy if exists claims_delete on claims;

create policy claims_delete on claims for delete
  using (
    resident_id = auth.uid()
    and not exists (
      select 1 from assessments a
      where a.cycle_id = claims.cycle_id and a.resident_id = auth.uid() and a.phase = 'baseline'
    )
  );

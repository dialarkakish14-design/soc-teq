-- Patch: let a logger release their own claim so someone else can pick it
-- up mid-day, without touching any topics/sessions already logged.
--
-- The original days_update policy's WITH CHECK always required the row's
-- final logger_id to equal the caller — which meant claiming worked but
-- releasing (setting it back to null) was silently rejected by RLS. The
-- USING clause already restricts this update to the current logger (or an
-- unclaimed day), so relaxing WITH CHECK to also allow null is safe: nobody
-- but the rightful logger (or first claimant) can reach this branch at all.

drop policy if exists days_update on days;

create policy days_update on days for update
  using (
    program_id = my_program_id() and pgy = my_pgy()
    and (logger_id is null or logger_id = auth.uid())
  )
  with check (
    program_id = my_program_id() and pgy = my_pgy()
    and (logger_id = auth.uid() or logger_id is null)
  );

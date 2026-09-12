-- Day, time, and location can't be changed from 6 days before a claim's
-- scheduled date through 3 days after it (the same grace window used to
-- decide "pending" vs "missed" on the client) — close enough to the date
-- that changing it would disrupt colleagues counting on it. A trigger
-- (not just RLS) because this only needs to block edits to those 3
-- columns specifically, not every update to the row (status/scholarly/
-- format changes still go through as normal). Run this once in the
-- Supabase SQL Editor.

create or replace function check_claim_schedule_lock()
returns trigger
language plpgsql as $$
begin
  if OLD.deliver_date is not null
    and OLD.deliver_date between (current_date - 3) and (current_date + 6)
    and (
      NEW.deliver_date is distinct from OLD.deliver_date
      or NEW.deliver_time is distinct from OLD.deliver_time
      or NEW.deliver_location is distinct from OLD.deliver_location
    )
  then
    raise exception 'Day, time, and location can''t be changed within 6 days before or 3 days after the scheduled date';
  end if;
  return NEW;
end;
$$;

drop trigger if exists claims_schedule_lock on claims;

create trigger claims_schedule_lock
before update on claims
for each row execute function check_claim_schedule_lock();

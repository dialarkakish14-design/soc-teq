-- Admin-only utility: wipes all teaching/rating/cycle data for one program
-- back to zero, so it can go live for real after a test/pilot period,
-- without touching the resident accounts themselves or other programs.
-- Not reachable from the app or by any resident — not granted to anon,
-- authenticated, or service_role, so it only runs when you (Diala) execute
-- it directly in the Supabase SQL Editor, which runs as the postgres
-- superuser and bypasses grants.
--
-- THIS IS PERMANENT. There is no undo. Before running reset_program_data(),
-- always first run:
--   select id, name from programs;
-- to get the right program_id, and double-check the name matches the
-- program you actually mean to wipe.
--
-- What it deletes for that program: every day (and everything under it —
-- sessions, topics, ratings, absences, private notes, reminder log, via
-- existing cascade rules already in schema.sql), every remediation cycle
-- (and its claims/assessments), and every shared resource. What it leaves
-- alone: the program row itself, and every resident account in it — so
-- the same residents can keep using the app, just with a clean slate.
-- Run this once in the Supabase SQL Editor.

create or replace function reset_program_data(p_program_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from days where program_id = p_program_id;
  delete from cycles where program_id = p_program_id;
  delete from resources where program_id = p_program_id;
end;
$$;

revoke all on function reset_program_data(uuid) from public, anon, authenticated, service_role;

-- To actually wipe a program, run (after confirming the id from the query above):
--   select reset_program_data('<program_id>');

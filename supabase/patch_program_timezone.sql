-- Makes the 4am rating-lock cutoff respect each program's own time zone
-- instead of a single hardcoded one (previously always America/Detroit,
-- which was wrong for any program outside Eastern time). Also adds a
-- "location" field to the program profile for context.
-- Run this once in the Supabase SQL Editor.

alter table programs add column if not exists location text;
alter table programs add column if not exists timezone text not null default 'America/Detroit';

-- New overload — added alongside the old is_day_open(date) rather than
-- replacing it in place, so existing policies keep working right up until
-- each one is switched over below. The old one-argument version is dropped
-- at the end of this patch, once nothing calls it anymore.
create or replace function is_day_open(d date, p_program_id uuid)
returns boolean
language sql stable as $$
  select now() < ((d + 1)::timestamp + time '04:00') at time zone (
    select timezone from programs where id = p_program_id
  );
$$;

-- Switch every policy that checked is_day_open(d.date) over to the new
-- is_day_open(d.date, d.program_id). ALTER POLICY restates the full
-- USING/WITH CHECK clause — these match schema.sql's current definitions.
alter policy sessions_insert on sessions with check (
  exists (
    select 1 from days d
    where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy sessions_update on sessions using (
  exists (
    select 1 from days d
    where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy sessions_delete on sessions using (
  exists (
    select 1 from days d
    where d.id = sessions.day_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy topics_insert on topics with check (
  exists (
    select 1 from sessions s join days d on d.id = s.day_id
    where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy topics_update on topics using (
  exists (
    select 1 from sessions s join days d on d.id = s.day_id
    where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy topics_delete on topics using (
  exists (
    select 1 from sessions s join days d on d.id = s.day_id
    where s.id = topics.session_id and d.logger_id = auth.uid() and is_day_open(d.date, d.program_id)
  )
);

alter policy ratings_insert on ratings with check (
  resident_id = auth.uid()
  and exists (
    select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
    where t.id = ratings.topic_id and t.soc_covered = true
      and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date, d.program_id)
  )
);

alter policy ratings_update on ratings with check (
  resident_id = auth.uid()
  and exists (
    select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
    where t.id = ratings.topic_id and is_day_open(d.date, d.program_id)
  )
);

alter policy absences_insert on absences with check (
  resident_id = auth.uid()
  and exists (
    select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
    where t.id = absences.topic_id and t.soc_covered = true
      and d.program_id = my_program_id() and d.pgy = my_pgy() and is_day_open(d.date, d.program_id)
  )
);

alter policy absences_delete on absences using (
  resident_id = auth.uid()
  and exists (
    select 1 from topics t join sessions s on s.id = t.session_id join days d on d.id = s.day_id
    where t.id = absences.topic_id and is_day_open(d.date, d.program_id)
  )
);

create or replace function close_finished_days()
returns void
language plpgsql security definer set search_path = public as $$
declare
  d record;
begin
  for d in
    select * from days
    where closed_at is null and not is_day_open(date, program_id)
  loop
    insert into absences (topic_id, resident_id, reason)
    select t.id, r.id, 'no_response'
    from sessions s
    join topics t on t.session_id = s.id and t.soc_covered = true
    cross join residents r
    where s.day_id = d.id
      and r.program_id = d.program_id
      and r.pgy = d.pgy
      and not exists (select 1 from ratings ra where ra.topic_id = t.id and ra.resident_id = r.id)
      and not exists (select 1 from absences ab where ab.topic_id = t.id and ab.resident_id = r.id)
    on conflict (topic_id, resident_id) do nothing;

    update days set closed_at = now() where id = d.id;
  end loop;
end;
$$;

-- Nothing calls the old one-argument version anymore, so this can go.
drop function if exists is_day_open(date);

-- Add location/timezone to the program-profile view and edit function.
create or replace view my_program with (security_invoker = false) as
  select id, name, profile_complete, setting, patient_mix, existing_curriculum, image_resources,
         location, timezone, profile_updated_at
  from programs
  where id = my_program_id();

drop function if exists update_program_profile(text, text, text, text);

create or replace function update_program_profile(
  p_setting text,
  p_patient_mix text,
  p_existing_curriculum text,
  p_image_resources text,
  p_location text,
  p_timezone text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_program_id uuid;
begin
  select role, program_id into v_role, v_program_id from residents where id = auth.uid();

  if v_role is distinct from 'program_lead' then
    raise exception 'Only a program lead can edit the program profile';
  end if;

  if coalesce(trim(p_setting), '') = '' or coalesce(trim(p_patient_mix), '') = ''
     or coalesce(trim(p_existing_curriculum), '') = '' or coalesce(trim(p_image_resources), '') = ''
     or coalesce(trim(p_timezone), '') = '' then
    raise exception 'All four fields and a time zone are required';
  end if;

  update programs
  set setting = trim(p_setting),
      patient_mix = trim(p_patient_mix),
      existing_curriculum = trim(p_existing_curriculum),
      image_resources = trim(p_image_resources),
      location = nullif(trim(p_location), ''),
      timezone = trim(p_timezone),
      profile_updated_at = current_date,
      profile_complete = true
  where id = v_program_id;
end;
$$;

grant execute on function update_program_profile(text, text, text, text, text, text) to authenticated;

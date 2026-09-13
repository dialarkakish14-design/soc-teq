-- Lets a program year start a new 6-month cycle after finishing one,
-- instead of being permanently limited to a single cycle ever. Cycles
-- were previously unique per (program_id, pgy) -- this drops that so a
-- new cycle can be inserted once the current one has reached impact
-- evaluation, and updates every function that assumed "one row per
-- program year" to instead look up the most recently created one. Run
-- this once in the Supabase SQL Editor.

alter table cycles add column if not exists created_at timestamptz not null default now();

alter table cycles drop constraint if exists cycles_program_id_pgy_key;

-- A new cycle can start once the current one (if any) has reached impact
-- evaluation -- not once it's fully wrapped up, since deciding "we're
-- really done with follow-up data collection" is a social call for the
-- cohort to make, same trust model as every other phase transition here.
create or replace function start_cycle(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_latest cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_latest from cycles
  where program_id = v_program_id and pgy = p_pgy
  order by created_at desc
  limit 1;

  if v_latest.id is not null and v_latest.phase4_started_at is null then
    raise exception 'The current cycle for this program year hasn''t reached impact evaluation yet';
  end if;

  insert into cycles (program_id, pgy, start_date) values (v_program_id, p_pgy, current_date);
end;
$$;

-- Phase 2/3/4 and the dashboard all previously assumed exactly one cycle
-- row per program year -- now there can be several over time, so each
-- needs to look up the most recent one instead.

create or replace function start_phase2(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_cycle from cycles
  where program_id = v_program_id and pgy = p_pgy
  order by created_at desc
  limit 1;

  if v_cycle.id is null then
    raise exception 'The cycle hasn''t started yet';
  end if;
  if v_cycle.phase2_started_at is not null then
    raise exception 'Identification and baseline has already started';
  end if;
  if v_cycle.start_date + 90 > current_date then
    raise exception 'Identification and baseline can''t start until 3 months into the cycle';
  end if;

  update cycles set phase2_started_at = now() where id = v_cycle.id;
end;
$$;

create or replace function start_phase3(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_cycle from cycles
  where program_id = v_program_id and pgy = p_pgy
  order by created_at desc
  limit 1;

  if v_cycle.id is null or v_cycle.phase2_started_at is null then
    raise exception 'Identification and baseline hasn''t started yet';
  end if;
  if v_cycle.phase3_started_at is not null then
    raise exception 'Resident-led remediation has already started';
  end if;

  update cycles set phase3_started_at = now() where id = v_cycle.id;
end;
$$;

create or replace function start_phase4(p_pgy text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle cycles%rowtype;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select * into v_cycle from cycles
  where program_id = v_program_id and pgy = p_pgy
  order by created_at desc
  limit 1;

  if v_cycle.id is null or v_cycle.phase3_started_at is null then
    raise exception 'Resident-led remediation hasn''t started yet';
  end if;
  if v_cycle.phase4_started_at is not null then
    raise exception 'Impact evaluation has already started';
  end if;
  if v_cycle.start_date + 180 > current_date then
    raise exception 'Impact evaluation can''t start until 6 months into the cycle';
  end if;

  update cycles set phase4_started_at = now() where id = v_cycle.id;
end;
$$;

create or replace function get_cycle_dashboard(p_pgy text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle jsonb;
  v_cycle_id uuid;
  v_cohort_count int;
  v_cohort jsonb;
  v_claims jsonb;
  v_assessments jsonb;
  v_resources jsonb;
  v_priority jsonb;
  v_requests jsonb;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select to_jsonb(c), c.id into v_cycle, v_cycle_id
  from cycles c
  where c.program_id = v_program_id and c.pgy = p_pgy
  order by c.created_at desc
  limit 1;

  select count(*) into v_cohort_count
  from residents where program_id = v_program_id and pgy = p_pgy;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'resident_code', resident_code)), '[]'::jsonb) into v_cohort
  from residents where program_id = v_program_id and pgy = p_pgy;

  if v_cycle_id is not null then
    select coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) into v_claims
    from claims cl where cl.cycle_id = v_cycle_id;

    select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into v_assessments
    from assessments a where a.cycle_id = v_cycle_id;

    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) into v_resources
    from resources r where r.program_id = v_program_id and r.pgy = p_pgy;

    select coalesce(jsonb_agg(to_jsonb(tr) order by tr.created_at), '[]'::jsonb) into v_requests
    from topic_requests tr
    join claims cl on cl.id = tr.claim_id
    where cl.cycle_id = v_cycle_id;

    select coalesce(
      jsonb_agg(jsonb_build_object('title', grp.title, 'ratings', grp.ratings, 'skin_types', grp.skin_types)), '[]'::jsonb
    ) into v_priority
    from (
      select
        ti.title,
        jsonb_agg(
          jsonb_build_object('depth', rt.depth, 'clarity', rt.clarity, 'nuance', rt.nuance, 'mgmt', rt.mgmt, 'conf', rt.conf)
        ) as ratings,
        coalesce(jsonb_agg(distinct ti.skin_type) filter (where ti.skin_type is not null), '[]'::jsonb) as skin_types
      from topics ti
      join sessions se on se.id = ti.session_id
      join days d on d.id = se.day_id
      left join ratings rt on rt.topic_id = ti.id
      where ti.soc_covered = true and d.program_id = v_program_id and d.pgy = p_pgy
      group by ti.title
    ) grp;
  else
    v_claims := '[]'::jsonb;
    v_assessments := '[]'::jsonb;
    v_resources := '[]'::jsonb;
    v_priority := '[]'::jsonb;
    v_requests := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'cycle', v_cycle,
    'cohort_count', v_cohort_count,
    'cohort', v_cohort,
    'claims', v_claims,
    'assessments', v_assessments,
    'resources', v_resources,
    'priority_topics', v_priority,
    'requests', v_requests
  );
end;
$$;

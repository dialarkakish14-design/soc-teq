-- Adds a computed cycle_number to get_cycle_dashboard's cycle object (1
-- for a program year's first-ever cycle, 2 for the next, etc.), so the UI
-- can say "Cycle 2" correctly instead of a hardcoded "Cycle 1" that would
-- go stale the moment a program year starts a second cycle. Not stored --
-- computed fresh each time from how many cycle rows exist at or before
-- this one. Run this once in the Supabase SQL Editor, after
-- patch_repeating_cycles.sql and patch_resources_per_cycle.sql.

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

  select
    to_jsonb(c) || jsonb_build_object(
      'cycle_number',
      (select count(*) from cycles c2 where c2.program_id = c.program_id and c2.pgy = c.pgy and c2.created_at <= c.created_at)
    ),
    c.id
  into v_cycle, v_cycle_id
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
    from resources r where r.cycle_id = v_cycle_id;

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

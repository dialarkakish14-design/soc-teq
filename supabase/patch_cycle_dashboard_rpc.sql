-- The Cycle tab was doing 2 sequential round trips to load (cycle+cohort
-- count, then claims+assessments+resources+topic ratings), which is the
-- real reason it felt slow to open — not any single query being heavy,
-- just the fixed network latency of each round trip added up. This
-- collapses the whole load into ONE round trip: a single function that
-- returns everything the tab needs as one JSON object.
--
-- Ratings are grouped by topic title inside this function (same "combine
-- every instance of the same subject, e.g. Melanoma, into one educational
-- need" logic already used client-side) so the client doesn't have to
-- transfer or re-group raw per-topic rows itself.
--
-- Run this once in the Supabase SQL Editor.

create or replace function get_cycle_dashboard(p_pgy text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_program_id uuid;
  v_cycle jsonb;
  v_cycle_id uuid;
  v_cohort_count int;
  v_claims jsonb;
  v_assessments jsonb;
  v_resources jsonb;
  v_priority jsonb;
begin
  v_program_id := my_program_id();
  if v_program_id is null or p_pgy <> my_pgy() then
    raise exception 'Not authorized for this program year';
  end if;

  select to_jsonb(c), c.id into v_cycle, v_cycle_id
  from cycles c where c.program_id = v_program_id and c.pgy = p_pgy;

  select count(*) into v_cohort_count
  from residents where program_id = v_program_id and pgy = p_pgy;

  if v_cycle_id is not null then
    select coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) into v_claims
    from claims cl where cl.cycle_id = v_cycle_id;

    select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into v_assessments
    from assessments a where a.cycle_id = v_cycle_id;

    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) into v_resources
    from resources r where r.program_id = v_program_id and r.pgy = p_pgy;

    select coalesce(jsonb_agg(jsonb_build_object('title', grp.title, 'ratings', grp.ratings)), '[]'::jsonb) into v_priority
    from (
      select
        ti.title,
        jsonb_agg(
          jsonb_build_object('depth', rt.depth, 'clarity', rt.clarity, 'nuance', rt.nuance, 'mgmt', rt.mgmt, 'conf', rt.conf)
        ) as ratings
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
  end if;

  return jsonb_build_object(
    'cycle', v_cycle,
    'cohort_count', v_cohort_count,
    'claims', v_claims,
    'assessments', v_assessments,
    'resources', v_resources,
    'priority_topics', v_priority
  );
end;
$$;

grant execute on function get_cycle_dashboard(text) to authenticated;

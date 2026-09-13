-- Adds topic_requests (comments) to get_cycle_history_detail, so a past
-- cycle's full export can include them, same as the current cycle's
-- "Export everything" already does. Run this once in the Supabase SQL
-- Editor.

create or replace function get_cycle_history_detail(p_cycle_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cycle jsonb;
  v_claims jsonb;
  v_assessments jsonb;
  v_resources jsonb;
  v_requests jsonb;
  v_cohort jsonb;
begin
  if not exists (
    select 1 from claims where cycle_id = p_cycle_id and resident_id = auth.uid()
    union all
    select 1 from assessments where cycle_id = p_cycle_id and resident_id = auth.uid()
  ) then
    raise exception 'Not authorized for this cycle';
  end if;

  select to_jsonb(c) into v_cycle from cycles c where c.id = p_cycle_id;
  if v_cycle is null then
    raise exception 'Cycle not found';
  end if;

  select coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) into v_claims
  from claims cl where cl.cycle_id = p_cycle_id;

  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into v_assessments
  from assessments a where a.cycle_id = p_cycle_id;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) into v_resources
  from resources r where r.cycle_id = p_cycle_id;

  select coalesce(jsonb_agg(to_jsonb(tr) order by tr.created_at), '[]'::jsonb) into v_requests
  from topic_requests tr
  join claims cl on cl.id = tr.claim_id
  where cl.cycle_id = p_cycle_id;

  select coalesce(jsonb_agg(jsonb_build_object('id', res.id, 'resident_code', res.resident_code)), '[]'::jsonb) into v_cohort
  from (
    select distinct res.id, res.resident_code
    from residents res
    where res.id in (
      select resident_id from claims where cycle_id = p_cycle_id
      union
      select resident_id from assessments where cycle_id = p_cycle_id
    )
  ) res;

  return jsonb_build_object(
    'cycle', v_cycle,
    'claims', v_claims,
    'assessments', v_assessments,
    'resources', v_resources,
    'requests', v_requests,
    'cohort', v_cohort
  );
end;
$$;

grant execute on function get_cycle_history_detail(uuid) to authenticated;

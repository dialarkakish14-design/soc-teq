-- Lets a resident look back at a cycle they were actually part of, even
-- after a new cycle has started for their program year, and even if
-- they've since moved up a PGY year -- access is gated by having actually
-- had a claim or assessment in that specific cycle_id, not by matching
-- pgy, since a resident's pgy changes over time but their historical
-- participation never does. That's also what keeps this year's PGY-2s
-- from seeing last year's PGY-2 cohort's history: they have no claims or
-- assessments tied to that old cycle_id at all. Run this once in the
-- Supabase SQL Editor, after patch_repeating_cycles.sql.

-- Every past cycle (i.e. not the current one for that program year) the
-- calling resident had any footprint in.
create or replace function list_my_cycle_history()
returns table (
  id uuid,
  start_date date,
  phase4_started_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.start_date, c.phase4_started_at
  from cycles c
  where (
      exists (select 1 from claims cl where cl.cycle_id = c.id and cl.resident_id = auth.uid())
      or exists (select 1 from assessments a where a.cycle_id = c.id and a.resident_id = auth.uid())
    )
    and c.id <> (
      select c2.id from cycles c2
      where c2.program_id = c.program_id and c2.pgy = c.pgy
      order by c2.created_at desc
      limit 1
    )
  order by c.start_date desc;
$$;

grant execute on function list_my_cycle_history() to authenticated;

-- The full record for one past cycle -- claims, assessments, and shared
-- readings from that cycle specifically -- gated by the same
-- "did I actually have a claim or assessment here" check.
create or replace function get_cycle_history_detail(p_cycle_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cycle jsonb;
  v_claims jsonb;
  v_assessments jsonb;
  v_resources jsonb;
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
    'cohort', v_cohort
  );
end;
$$;

grant execute on function get_cycle_history_detail(uuid) to authenticated;

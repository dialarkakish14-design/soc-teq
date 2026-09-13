-- "What I'd want covered" — any resident in the cohort can leave a
-- request on a claimed topic (Phase 3): a free-text comment, one or more
-- preset tags (myths/misconceptions, fun facts, etc.), or both. Visible to
-- everyone, editable/deletable only by whoever posted it. Run this once in
-- the Supabase SQL Editor.

create table if not exists topic_requests (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  comment text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint topic_requests_content check (length(trim(comment)) > 0 or array_length(tags, 1) > 0)
);

create index if not exists topic_requests_claim_id_idx on topic_requests(claim_id);

alter table topic_requests enable row level security;

create policy topic_requests_select on topic_requests for select
  using (
    exists (
      select 1 from claims c
      join cycles cy on cy.id = c.cycle_id
      where c.id = topic_requests.claim_id
        and cy.program_id = my_program_id()
        and cy.pgy = my_pgy()
    )
  );

create policy topic_requests_insert on topic_requests for insert
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from claims c
      join cycles cy on cy.id = c.cycle_id
      where c.id = topic_requests.claim_id
        and cy.program_id = my_program_id()
        and cy.pgy = my_pgy()
    )
  );

create policy topic_requests_delete on topic_requests for delete
  using (resident_id = auth.uid());

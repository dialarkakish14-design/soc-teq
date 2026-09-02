-- Patch: the six-month remediation cycle (build spec section 3.4 and the
-- Summary screen's Cycle tab). Adds cycles, claims, assessments, and
-- resources — the last table the build spec still needs.

create table cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  start_date date not null,
  unique (program_id, pgy)
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles (id) on delete cascade,
  resident_id uuid not null references residents (id),
  topic_title text not null,
  format text not null check (format in ('Peer-teaching module', 'SoC journal club', 'Digital repository case set')),
  status text not null default 'planned' check (status in ('planned', 'delivered')),
  scholarly boolean not null default false,
  created_at timestamptz not null default now()
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles (id) on delete cascade,
  resident_id uuid not null references residents (id),
  phase text not null check (phase in ('baseline', 'followup')),
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (cycle_id, resident_id, phase)
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  pgy text not null check (pgy in ('PGY-2', 'PGY-3', 'PGY-4')),
  topic_title text not null,
  resident_id uuid not null references residents (id),
  source text not null,
  url text,
  takeaway text not null,
  created_at timestamptz not null default now()
);

alter table cycles enable row level security;
alter table claims enable row level security;
alter table assessments enable row level security;
alter table resources enable row level security;

-- cycles: cohort-scoped read; any cohort member can create the row that
-- starts their cycle (there's no program-lead/Team screen yet to do this
-- centrally, so the cycle simply begins the first time anyone visits the
-- Cycle tab — a resident calling this is only ever creating their own
-- cohort's single cycle row, never anyone else's, and the unique
-- constraint above stops a second one from ever existing).
create policy cycles_select on cycles for select
  using (program_id = my_program_id() and pgy = my_pgy());

create policy cycles_insert on cycles for insert
  with check (program_id = my_program_id() and pgy = my_pgy());

-- claims: cohort-scoped read (so everyone sees who claimed what). A
-- resident may only create/edit/delete their own claim.
create policy claims_select on claims for select
  using (
    exists (select 1 from cycles c where c.id = claims.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy claims_insert on claims for insert
  with check (
    resident_id = auth.uid()
    and exists (select 1 from cycles c where c.id = claims.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy claims_update on claims for update
  using (resident_id = auth.uid())
  with check (resident_id = auth.uid());

create policy claims_delete on claims for delete
  using (resident_id = auth.uid());

-- assessments: a resident may read the cohort's rows (needed to compute the
-- cohort mean) but only ever write their own score, once per phase.
create policy assessments_select on assessments for select
  using (
    exists (select 1 from cycles c where c.id = assessments.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

create policy assessments_insert on assessments for insert
  with check (
    resident_id = auth.uid()
    and exists (select 1 from cycles c where c.id = assessments.cycle_id and c.program_id = my_program_id() and c.pgy = my_pgy())
  );

-- resources: cohort-scoped read/write. Column-level gating for "locked
-- until phase 3+" happens in the app (same pattern as everywhere else in
-- this schema — RLS enforces *whose* data, not *when* a feature unlocks,
-- since that's a product-timing rule, not an authorization rule).
create policy resources_select on resources for select
  using (program_id = my_program_id() and pgy = my_pgy());

create policy resources_insert on resources for insert
  with check (resident_id = auth.uid() and program_id = my_program_id() and pgy = my_pgy());

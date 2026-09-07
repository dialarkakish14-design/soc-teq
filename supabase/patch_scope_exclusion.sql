-- Lets the logger (with the room) mark diagnostic nuance and/or management
-- as genuinely outside a session's scope, rather than forcing every topic
-- to rate all 5 items or leaving "wasn't discussed" ambiguous with "was
-- discussed poorly." Only nuance and management are excludable — depth,
-- visual clarity, and confidence always apply once a topic is covered.
-- Run this once in the Supabase SQL Editor.

alter table topics add column if not exists nuance_applicable boolean not null default true;
alter table topics add column if not exists nuance_scope_reason text;
alter table topics add column if not exists mgmt_applicable boolean not null default true;
alter table topics add column if not exists mgmt_scope_reason text;

-- Ratings no longer require every item — nuance/mgmt are left null when
-- the topic marked that domain out of scope, so it's structurally absent
-- rather than a forced number or a false 0.
alter table ratings alter column nuance drop not null;
alter table ratings alter column mgmt drop not null;

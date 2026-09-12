-- Adds two more teaching formats residents can claim a priority topic
-- under, alongside the original three. Run this once in the Supabase SQL
-- Editor.

alter table claims drop constraint if exists claims_format_check;

alter table claims add constraint claims_format_check check (
  format in (
    'Peer-teaching module', 'SoC journal club', 'Digital repository case set',
    'Grand rounds presentation', 'Mini-lecture / didactic session'
  )
);

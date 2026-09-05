-- Replaces the 12-category session type list with the final 10-category
-- one, resolving overlap (Lecture folded into Didactic, Specialty clinics
-- split out) that made logging inconsistent between residents.
-- Run this once in the Supabase SQL Editor.

-- Relabel existing rows BEFORE swapping the constraint, since Postgres
-- validates every existing row against a new check constraint.
-- Direct renames (meaning unchanged):
update sessions set type = 'Lecture / structured didactic' where type = 'Lecture';
update sessions set type = 'Lecture / structured didactic' where type = 'Didactic';
update sessions set type = 'Grand rounds' where type = 'Grand round';
update sessions set type = 'Outpatient clinic' where type = 'Clinic outpatient';
update sessions set type = 'Inpatient / consult service' where type = 'Clinic inpatient';
update sessions set type = 'Tumor board / multidisciplinary conference' where type = 'Tumor board';
update sessions set type = 'Dermatopathology teaching / sign-out' where type = 'Dermatopathology';

-- These four categories were removed with no direct equivalent in the new
-- list (Surgical dermatology, Pediatric dermatology, and Specialty clinics
-- could each be outpatient or inpatient depending on the specific session;
-- Conferences meant external meetings, which the new list doesn't track
-- separately) — logged under the new catch-all bucket instead. Re-run a
-- targeted update afterward if any of these should land somewhere more
-- specific for your program's history.
update sessions set type = 'Other teaching session' where type = 'Surgical dermatology';
update sessions set type = 'Other teaching session' where type = 'Pediatric dermatology';
update sessions set type = 'Other teaching session' where type = 'Specialty clinics';
update sessions set type = 'Other teaching session' where type = 'Conferences';

alter table sessions drop constraint sessions_type_check;
alter table sessions add constraint sessions_type_check check (
  type in (
    'Lecture / structured didactic', 'Grand rounds', 'Journal club', 'Case conference / unknowns',
    'Tumor board / multidisciplinary conference', 'Dermatopathology teaching / sign-out',
    'Workshop / skills lab', 'Outpatient clinic', 'Inpatient / consult service', 'Other teaching session'
  )
);

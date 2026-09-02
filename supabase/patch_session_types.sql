-- Adds five more session-type categories so settings beyond formal
-- lectures/clinics can be logged the same way — same rating/scoring, just
-- more options in the picker. Does not change the rating instrument itself.
-- Run this once in the Supabase SQL Editor.

alter table sessions drop constraint sessions_type_check;

alter table sessions add constraint sessions_type_check check (
  type in (
    'Lecture', 'Didactic', 'Grand round', 'Clinic outpatient', 'Clinic inpatient', 'Journal club', 'Tumor board',
    'Surgical dermatology', 'Dermatopathology', 'Pediatric dermatology', 'Specialty clinics', 'Conferences'
  )
);

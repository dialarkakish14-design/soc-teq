-- Adds a few placeholder programs so the sign-up dropdown demonstrates
-- multiple institutions instead of just Wayne State. Names are deliberately
-- generic — swap in real program names once actual programs are onboarded.
-- Run this once in the Supabase SQL Editor.

insert into programs (name, access_code, profile_complete)
values
  ('Program B — Dermatology', 'PROGRAMB2026', true),
  ('Program C — Dermatology', 'PROGRAMC2026', true),
  ('Program D — Dermatology', 'PROGRAMD2026', true);

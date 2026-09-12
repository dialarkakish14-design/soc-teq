-- Adds an optional time alongside the existing optional day/location for
-- a claimed topic (see patch_claim_delivery_details.sql). Run this once
-- in the Supabase SQL Editor.

alter table claims add column if not exists deliver_time time;

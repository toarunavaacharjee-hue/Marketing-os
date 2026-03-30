-- Add structured scorecard + ICP profile for segments (ICP Segmentation module).
-- Run in Supabase SQL Editor after module_settings_and_segments.sql.

alter table public.segments
  add column if not exists details jsonb not null default '{}'::jsonb;

comment on column public.segments.details is
  'JSON: urgency, budget_fit, acv_potential, retention_potential (0-100), icp_profile (text).';

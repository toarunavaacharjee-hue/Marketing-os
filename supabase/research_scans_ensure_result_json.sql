-- Run once in Supabase SQL editor if GET /api/research/latest returns 500 and logs show
-- an undefined_column / result_json error (older installs created research_scans before result_json).
alter table public.research_scans add column if not exists result_json jsonb;

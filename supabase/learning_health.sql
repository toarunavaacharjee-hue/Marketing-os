-- Marketing OS: Learning & Health tables (per Default environment)
-- Run this in Supabase -> SQL Editor

-- Sync runs per connector (GA4, HubSpot, LinkedIn, Meta, etc.)
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  connector text not null, -- e.g. ga4, hubspot, linkedin_ads, meta_ads
  status text not null default 'success', -- success | warning | error
  assets_ingested integer not null default 0,
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Assets indexed for "learning"
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  source text not null, -- ga4 | hubspot | website | gdrive | notion | manual
  asset_type text not null, -- page | doc | deck | creative | post | deal | call_note
  title text not null,
  url text,
  status text not null default 'indexed', -- indexed | stale | failed
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sync_runs enable row level security;
alter table public.assets enable row level security;

-- Requires public.is_environment_member(eid uuid) from previous scripts
drop policy if exists "sync_runs_select_member" on public.sync_runs;
create policy "sync_runs_select_member"
on public.sync_runs
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists "sync_runs_insert_member" on public.sync_runs;
create policy "sync_runs_insert_member"
on public.sync_runs
for insert
to authenticated
with check (public.is_environment_member(environment_id));

drop policy if exists "assets_select_member" on public.assets;
create policy "assets_select_member"
on public.assets
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists "assets_insert_member" on public.assets;
create policy "assets_insert_member"
on public.assets
for insert
to authenticated
with check (public.is_environment_member(environment_id));

drop policy if exists "assets_update_member" on public.assets;
create policy "assets_update_member"
on public.assets
for update
to authenticated
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));


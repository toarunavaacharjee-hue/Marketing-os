-- Marketing OS: Launch Playbook runs + Artifact Library items
-- Run in Supabase -> SQL Editor after:
-- - module_settings_and_segments.sql (defines is_environment_member + touch_updated_at)
-- - product_environments_policies.sql and workspace_and_product_rbac.sql

create extension if not exists pgcrypto;

-- Track playbook workflow runs (agentic workflows)
create table if not exists public.launch_playbook_runs (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('product-launch', 'feature-launch')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists launch_playbook_runs_env_created_idx
  on public.launch_playbook_runs(environment_id, created_at desc);

create index if not exists launch_playbook_runs_created_by_created_idx
  on public.launch_playbook_runs(created_by, created_at desc);

drop trigger if exists launch_playbook_runs_touch on public.launch_playbook_runs;
create trigger launch_playbook_runs_touch
before update on public.launch_playbook_runs
for each row execute function public.touch_updated_at();

alter table public.launch_playbook_runs enable row level security;

drop policy if exists launch_playbook_runs_select on public.launch_playbook_runs;
create policy launch_playbook_runs_select on public.launch_playbook_runs
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists launch_playbook_runs_insert on public.launch_playbook_runs;
create policy launch_playbook_runs_insert on public.launch_playbook_runs
for insert
to authenticated
with check (public.is_environment_member(environment_id) and created_by = auth.uid());

drop policy if exists launch_playbook_runs_update on public.launch_playbook_runs;
create policy launch_playbook_runs_update on public.launch_playbook_runs
for update
to authenticated
using (public.is_environment_member(environment_id) and created_by = auth.uid())
with check (public.is_environment_member(environment_id) and created_by = auth.uid());

-- Artifact Library (structured outputs saved for reuse)
create table if not exists public.artifact_library_items (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  source_run_id uuid references public.launch_playbook_runs(id) on delete set null,
  artifact_type text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artifact_library_items_env_created_idx
  on public.artifact_library_items(environment_id, created_at desc);

create index if not exists artifact_library_items_type_idx
  on public.artifact_library_items(environment_id, artifact_type);

drop trigger if exists artifact_library_items_touch on public.artifact_library_items;
create trigger artifact_library_items_touch
before update on public.artifact_library_items
for each row execute function public.touch_updated_at();

alter table public.artifact_library_items enable row level security;

drop policy if exists artifact_library_items_select on public.artifact_library_items;
create policy artifact_library_items_select on public.artifact_library_items
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists artifact_library_items_insert on public.artifact_library_items;
create policy artifact_library_items_insert on public.artifact_library_items
for insert
to authenticated
with check (public.is_environment_member(environment_id) and created_by = auth.uid());

drop policy if exists artifact_library_items_update on public.artifact_library_items;
create policy artifact_library_items_update on public.artifact_library_items
for update
to authenticated
using (public.is_environment_member(environment_id) and created_by = auth.uid())
with check (public.is_environment_member(environment_id) and created_by = auth.uid());


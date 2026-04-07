-- Prospect Research Jobs: async-ish memo generation to avoid long-running request failures.
-- Run in Supabase SQL editor after product_environments exists.

create extension if not exists pgcrypto;

create table if not exists public.prospect_research_jobs (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  input_json jsonb not null default '{}'::jsonb,
  memo_json jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_research_jobs_env_created_idx
  on public.prospect_research_jobs(environment_id, created_at desc);

create index if not exists prospect_research_jobs_created_by_created_idx
  on public.prospect_research_jobs(created_by, created_at desc);

alter table public.prospect_research_jobs enable row level security;

drop policy if exists prospect_research_jobs_select on public.prospect_research_jobs;
create policy prospect_research_jobs_select on public.prospect_research_jobs
for select
using (public.is_environment_member(environment_id));

drop policy if exists prospect_research_jobs_insert on public.prospect_research_jobs;
create policy prospect_research_jobs_insert on public.prospect_research_jobs
for insert
with check (public.is_environment_member(environment_id) and created_by = auth.uid());

drop policy if exists prospect_research_jobs_update on public.prospect_research_jobs;
create policy prospect_research_jobs_update on public.prospect_research_jobs
for update
using (public.is_environment_member(environment_id) and created_by = auth.uid())
with check (public.is_environment_member(environment_id) and created_by = auth.uid());

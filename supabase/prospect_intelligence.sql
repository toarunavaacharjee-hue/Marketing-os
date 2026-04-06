-- Prospect Intelligence: saved account research memos per product environment
-- Run in Supabase SQL editor after product_environments exists.

create table if not exists public.prospect_intelligence (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  company_name text,
  website_url text,
  deal_stage text,
  memo_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_intelligence_env_updated_idx
  on public.prospect_intelligence(environment_id, updated_at desc);

alter table public.prospect_intelligence enable row level security;

drop policy if exists prospect_intelligence_select on public.prospect_intelligence;
create policy prospect_intelligence_select on public.prospect_intelligence
for select
using (public.is_environment_member(environment_id));

drop policy if exists prospect_intelligence_insert on public.prospect_intelligence;
create policy prospect_intelligence_insert on public.prospect_intelligence
for insert
with check (public.is_environment_member(environment_id));

drop policy if exists prospect_intelligence_update on public.prospect_intelligence;
create policy prospect_intelligence_update on public.prospect_intelligence
for update
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists prospect_intelligence_delete on public.prospect_intelligence;
create policy prospect_intelligence_delete on public.prospect_intelligence
for delete
using (public.is_environment_member(environment_id));

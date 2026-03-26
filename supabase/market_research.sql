-- Market Research: product profile + competitors + scans/snapshots
-- Run this in Supabase SQL editor.

-- 1) Extend products with profile fields (safe if already added)
alter table public.products
  add column if not exists category text,
  add column if not exists icp_summary text,
  add column if not exists positioning_summary text;

-- 2) Competitors per product
create table if not exists public.product_competitors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  website_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_competitors_product_id_idx
  on public.product_competitors(product_id);

-- 2b) RLS for product_competitors + product profile updates
alter table public.product_competitors enable row level security;

-- Helper: can the current user access a product?
create or replace function public.is_product_member(pid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.products p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = pid
      and cm.user_id = auth.uid()
  );
$$;

drop policy if exists product_competitors_select_member on public.product_competitors;
create policy product_competitors_select_member on public.product_competitors
for select
using (public.is_product_member(product_id));

drop policy if exists product_competitors_insert_member on public.product_competitors;
create policy product_competitors_insert_member on public.product_competitors
for insert
with check (public.is_product_member(product_id));

drop policy if exists product_competitors_update_member on public.product_competitors;
create policy product_competitors_update_member on public.product_competitors
for update
using (public.is_product_member(product_id))
with check (public.is_product_member(product_id));

drop policy if exists product_competitors_delete_member on public.product_competitors;
create policy product_competitors_delete_member on public.product_competitors
for delete
using (public.is_product_member(product_id));

-- Products table: allow members to update product profile fields
alter table public.products enable row level security;

drop policy if exists products_update_member on public.products;
create policy products_update_member on public.products
for update
using (exists (
  select 1
  from public.company_members cm
  where cm.company_id = public.products.company_id
    and cm.user_id = auth.uid()
))
with check (exists (
  select 1
  from public.company_members cm
  where cm.company_id = public.products.company_id
    and cm.user_id = auth.uid()
));

-- 3) Research scans (per product's Default environment)
create table if not exists public.research_scans (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'completed', -- completed | running | failed
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists research_scans_env_created_idx
  on public.research_scans(environment_id, created_at desc);

-- 4) Snapshots captured during a scan
create table if not exists public.research_snapshots (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.research_scans(id) on delete cascade,
  url text not null,
  source_type text not null, -- product | competitor
  competitor_id uuid references public.product_competitors(id) on delete set null,
  title text,
  text_content text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists research_snapshots_scan_id_idx
  on public.research_snapshots(scan_id);

-- 5) RLS for research_* (scoped by environment membership)
alter table public.research_scans enable row level security;
alter table public.research_snapshots enable row level security;

-- Uses helper function from earlier scripts. If missing, create it.
-- IMPORTANT: this function already exists in your project and is referenced by policies.
-- We keep the same signature/parameter name ("eid") to avoid Postgres errors.
create or replace function public.is_environment_member(eid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.product_environments pe
    join public.products p on p.id = pe.product_id
    join public.company_members cm on cm.company_id = p.company_id
    where pe.id = eid
      and cm.user_id = auth.uid()
  );
$$;

drop policy if exists research_scans_select on public.research_scans;
create policy research_scans_select on public.research_scans
for select
using (public.is_environment_member(environment_id));

drop policy if exists research_scans_insert on public.research_scans;
create policy research_scans_insert on public.research_scans
for insert
with check (public.is_environment_member(environment_id));

drop policy if exists research_scans_update on public.research_scans;
create policy research_scans_update on public.research_scans
for update
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists research_scans_delete on public.research_scans;
create policy research_scans_delete on public.research_scans
for delete
using (public.is_environment_member(environment_id));

-- Snapshots: need to derive env membership via scan row
create or replace function public.can_access_research_scan(scan_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.research_scans rs
    where rs.id = scan_id
      and public.is_environment_member(rs.environment_id)
  );
$$;

drop policy if exists research_snapshots_select on public.research_snapshots;
create policy research_snapshots_select on public.research_snapshots
for select
using (public.can_access_research_scan(scan_id));

drop policy if exists research_snapshots_insert on public.research_snapshots;
create policy research_snapshots_insert on public.research_snapshots
for insert
with check (public.can_access_research_scan(scan_id));

drop policy if exists research_snapshots_update on public.research_snapshots;
create policy research_snapshots_update on public.research_snapshots
for update
using (public.can_access_research_scan(scan_id))
with check (public.can_access_research_scan(scan_id));

drop policy if exists research_snapshots_delete on public.research_snapshots;
create policy research_snapshots_delete on public.research_snapshots
for delete
using (public.can_access_research_scan(scan_id));


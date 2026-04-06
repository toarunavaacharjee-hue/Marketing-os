-- Market Research: product profile + competitors + scans/snapshots
-- Run this in Supabase SQL editor.

-- 1) Extend products with profile fields (safe if already added)
alter table public.products
  add column if not exists category text,
  add column if not exists icp_summary text,
  add column if not exists positioning_summary text;

-- Optional Market Research sources (G2/Capterra pages + industry RSS)
alter table public.products
  add column if not exists g2_review_url text,
  add column if not exists capterra_review_url text,
  add column if not exists news_rss_url text,
  add column if not exists news_keywords text;

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
  result_json jsonb,
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

-- 6) Battlecards (per product + Default environment)
create table if not exists public.battlecards (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  competitor_id uuid not null references public.product_competitors(id) on delete cascade,
  strengths text,
  weaknesses text,
  why_we_win text,
  objection_handling text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment_id, competitor_id)
);

create index if not exists battlecards_env_idx
  on public.battlecards(environment_id, updated_at desc);

alter table public.battlecards enable row level security;

drop policy if exists battlecards_select on public.battlecards;
create policy battlecards_select on public.battlecards
for select
using (public.is_environment_member(environment_id));

drop policy if exists battlecards_insert on public.battlecards;
create policy battlecards_insert on public.battlecards
for insert
with check (public.is_environment_member(environment_id));

drop policy if exists battlecards_update on public.battlecards;
create policy battlecards_update on public.battlecards
for update
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists battlecards_delete on public.battlecards;
create policy battlecards_delete on public.battlecards
for delete
using (public.is_environment_member(environment_id));

-- 7) Customer personas + pitch battlecards (per environment)
create table if not exists public.customer_personas (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  website_url text,
  industry text,
  segment text,
  company_size text,
  buyer_roles text,
  pains text,
  current_stack text,
  decision_criteria text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_personas_env_idx
  on public.customer_personas(environment_id, updated_at desc);

alter table public.customer_personas enable row level security;

drop policy if exists customer_personas_select on public.customer_personas;
create policy customer_personas_select on public.customer_personas
for select
using (public.is_environment_member(environment_id));

drop policy if exists customer_personas_insert on public.customer_personas;
create policy customer_personas_insert on public.customer_personas
for insert
with check (public.is_environment_member(environment_id));

drop policy if exists customer_personas_update on public.customer_personas;
create policy customer_personas_update on public.customer_personas
for update
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists customer_personas_delete on public.customer_personas;
create policy customer_personas_delete on public.customer_personas
for delete
using (public.is_environment_member(environment_id));

create table if not exists public.battlecard_pitches (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  competitor_id uuid not null references public.product_competitors(id) on delete cascade,
  persona_id uuid not null references public.customer_personas(id) on delete cascade,
  pitch_markdown text not null,
  pitch_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment_id, competitor_id, persona_id)
);

create index if not exists battlecard_pitches_env_idx
  on public.battlecard_pitches(environment_id, updated_at desc);

alter table public.battlecard_pitches enable row level security;

drop policy if exists battlecard_pitches_select on public.battlecard_pitches;
create policy battlecard_pitches_select on public.battlecard_pitches
for select
using (public.is_environment_member(environment_id));

drop policy if exists battlecard_pitches_insert on public.battlecard_pitches;
create policy battlecard_pitches_insert on public.battlecard_pitches
for insert
with check (public.is_environment_member(environment_id));

drop policy if exists battlecard_pitches_update on public.battlecard_pitches;
create policy battlecard_pitches_update on public.battlecard_pitches
for update
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists battlecard_pitches_delete on public.battlecard_pitches;
create policy battlecard_pitches_delete on public.battlecard_pitches
for delete
using (public.is_environment_member(environment_id));

-- 8) Persona kind: ICP (segment) vs account (named prospect)
alter table public.customer_personas add column if not exists kind text default 'icp';
update public.customer_personas set kind = 'icp' where kind is null or kind = '';
alter table public.customer_personas alter column kind set default 'icp';
alter table public.customer_personas alter column kind set not null;
alter table public.customer_personas drop constraint if exists customer_personas_kind_check;
alter table public.customer_personas add constraint customer_personas_kind_check check (kind in ('icp', 'account'));

-- 9) Ensure research_scans has result_json (older DBs may have created the table before this column existed)
alter table public.research_scans add column if not exists result_json jsonb;


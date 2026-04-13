-- Marketing OS: Positioning versions (draft / review / approved) + spine pointers + battlecard linkage
-- Run in Supabase SQL Editor after core tables exist:
--   public.products, public.product_environments, public.product_members, public.profiles,
--   public.battlecards

-- ---------------------------------------------------------------------------
-- positioning_versions: immutable-ish snapshots of the positioning canvas JSON
-- ---------------------------------------------------------------------------
create table if not exists public.positioning_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  product_id uuid not null references public.products (id) on delete cascade,
  environment_id uuid not null references public.product_environments (id) on delete cascade,

  version_number int not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'approved', 'superseded')),

  -- Full canvas snapshot (same shape as module_settings positioning_studio / canvas)
  value_json jsonb not null default '{}'::jsonb,

  submitted_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  review_due_at timestamptz,

  unique (environment_id, version_number)
);

create index if not exists positioning_versions_env_created_idx
  on public.positioning_versions (environment_id, created_at desc);

create index if not exists positioning_versions_env_status_idx
  on public.positioning_versions (environment_id, status);

-- Which approved snapshot is the spine for this environment (nullable until first approval)
alter table public.product_environments
  add column if not exists approved_positioning_version_id uuid references public.positioning_versions (id) on delete set null;

create index if not exists product_environments_approved_pos_idx
  on public.product_environments (approved_positioning_version_id);

-- Battlecards created/updated while a given approved version was current
alter table public.battlecards
  add column if not exists positioning_version_id uuid references public.positioning_versions (id) on delete set null;

create index if not exists battlecards_positioning_version_idx
  on public.battlecards (positioning_version_id);

-- ---------------------------------------------------------------------------
-- RLS (align with product-scoped data)
-- ---------------------------------------------------------------------------
alter table public.positioning_versions enable row level security;

drop policy if exists positioning_versions_select_member on public.positioning_versions;
create policy positioning_versions_select_member
on public.positioning_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.product_members pm
    where pm.product_id = public.positioning_versions.product_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists positioning_versions_insert_admin on public.positioning_versions;
drop policy if exists positioning_versions_insert_member on public.positioning_versions;
create policy positioning_versions_insert_member
on public.positioning_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.product_members pm
    where pm.product_id = public.positioning_versions.product_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists positioning_versions_update_admin on public.positioning_versions;
drop policy if exists positioning_versions_update_member on public.positioning_versions;
create policy positioning_versions_update_member
on public.positioning_versions
for update
to authenticated
using (
  exists (
    select 1
    from public.product_members pm
    where pm.product_id = public.positioning_versions.product_id
      and pm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.product_members pm
    where pm.product_id = public.positioning_versions.product_id
      and pm.user_id = auth.uid()
  )
);

-- NOTE: Updating public.product_environments.approved_positioning_version_id requires your existing
-- RLS policies to allow product owners/admins to UPDATE product_environments. If approve fails in-app,
-- add an UPDATE policy for product_environments scoped to product_members (owner/admin).

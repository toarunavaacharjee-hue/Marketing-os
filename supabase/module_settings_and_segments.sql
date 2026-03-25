-- Marketing OS: per-product Default environment settings
-- Run this in Supabase -> SQL Editor

-- Segments (scoped to product_environments)
create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  name text not null,
  pnf_score integer not null default 0,
  pain_points text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

-- Module settings (generic JSON storage per environment)
create table if not exists public.module_settings (
  environment_id uuid not null references public.product_environments(id) on delete cascade,
  module text not null,
  key text not null,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (environment_id, module, key)
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists module_settings_touch on public.module_settings;
create trigger module_settings_touch
before update on public.module_settings
for each row execute function public.touch_updated_at();

-- RLS
alter table public.segments enable row level security;
alter table public.module_settings enable row level security;

-- Helper: user is member of an environment via product -> company membership
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
    where pe.id = eid and cm.user_id = auth.uid()
  );
$$;

-- Segments policies
drop policy if exists "segments_select_member" on public.segments;
create policy "segments_select_member"
on public.segments
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists "segments_insert_member" on public.segments;
create policy "segments_insert_member"
on public.segments
for insert
to authenticated
with check (public.is_environment_member(environment_id));

drop policy if exists "segments_update_member" on public.segments;
create policy "segments_update_member"
on public.segments
for update
to authenticated
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));

drop policy if exists "segments_delete_member" on public.segments;
create policy "segments_delete_member"
on public.segments
for delete
to authenticated
using (public.is_environment_member(environment_id));

-- Module settings policies
drop policy if exists "module_settings_select_member" on public.module_settings;
create policy "module_settings_select_member"
on public.module_settings
for select
to authenticated
using (public.is_environment_member(environment_id));

drop policy if exists "module_settings_upsert_member" on public.module_settings;
create policy "module_settings_upsert_member"
on public.module_settings
for insert
to authenticated
with check (public.is_environment_member(environment_id));

drop policy if exists "module_settings_update_member" on public.module_settings;
create policy "module_settings_update_member"
on public.module_settings
for update
to authenticated
using (public.is_environment_member(environment_id))
with check (public.is_environment_member(environment_id));


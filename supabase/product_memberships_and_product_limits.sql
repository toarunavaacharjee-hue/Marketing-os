-- Product-level membership (clean permissions) + product add-on limits
-- Run AFTER:
-- - team_governance_and_support.sql
-- - company_subscriptions.sql
-- - base tables: companies, products

-- 1) Product members table
create table if not exists public.product_members (
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- owner|admin|member
  created_at timestamptz not null default now(),
  primary key (product_id, user_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_members_role_check') then
    alter table public.product_members
      add constraint product_members_role_check
      check (role in ('owner','admin','member'));
  end if;
end $$;

create index if not exists product_members_user_idx
  on public.product_members(user_id, product_id);

alter table public.product_members enable row level security;

-- 2) Helper functions (mirrors company helpers)
create or replace function public.is_product_member(pid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.product_members pm
    where pm.product_id = pid
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_product_admin(pid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.product_members pm
    where pm.product_id = pid
      and pm.user_id = auth.uid()
      and pm.role in ('owner','admin')
  );
$$;

-- 3) RLS policies
-- IMPORTANT: product_members policies must NOT call is_product_member/is_product_admin,
-- otherwise they recurse on product_members and can overflow the stack.

drop policy if exists product_members_select_self on public.product_members;
create policy product_members_select_self
on public.product_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists product_members_insert_self on public.product_members;
create policy product_members_insert_self
on public.product_members
for insert
to authenticated
with check (user_id = auth.uid());

-- No updates from clients (prevents users changing their own role).
drop policy if exists product_members_update_none on public.product_members;
create policy product_members_update_none
on public.product_members
for update
to authenticated
using (false)
with check (false);

-- Allow users to remove their own membership (optional; keeps things simple).
drop policy if exists product_members_delete_self on public.product_members;
create policy product_members_delete_self
on public.product_members
for delete
to authenticated
using (user_id = auth.uid());

-- 4) Optional backfill: give every company owner/admin access to all products in their company.
-- Uncomment if you already have data and want safe defaults.
-- insert into public.product_members(product_id, user_id, role)
-- select p.id, cm.user_id, case when cm.role = 'owner' then 'owner' else 'admin' end
-- from public.products p
-- join public.company_members cm on cm.company_id = p.company_id
-- where cm.role in ('owner','admin')
-- on conflict (product_id, user_id) do nothing;


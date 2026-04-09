-- Marketing OS: Allow workspace admins manage product access
--
-- Adds RLS policies on public.product_members so company owners/admins can
-- view + grant/revoke product access for any user in their workspace.
--
-- Run AFTER:
-- - team_governance_and_support.sql
-- - product_memberships_and_product_limits.sql

alter table public.product_members enable row level security;

-- NOTE: product_members policies must NOT call is_product_member/is_product_admin
-- to avoid recursion.

drop policy if exists product_members_select_company_admin on public.product_members;
create policy product_members_select_company_admin
on public.product_members
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.product_members.product_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  )
);

drop policy if exists product_members_insert_company_admin on public.product_members;
create policy product_members_insert_company_admin
on public.product_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.products p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.product_members.product_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  )
);

drop policy if exists product_members_delete_company_admin on public.product_members;
create policy product_members_delete_company_admin
on public.product_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.product_members.product_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  )
);


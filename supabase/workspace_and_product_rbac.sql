-- Marketing OS: Workspace + Product RBAC (best practices)
-- Run AFTER:
-- - team_governance_and_support.sql (company roles + is_company_admin/is_company_member)
-- - product_memberships_and_product_limits.sql (product roles + is_product_admin/is_product_member)
-- - base tables: companies, products, product_competitors (if used)

-- Companies (workspaces)
alter table public.companies enable row level security;

-- Members can read their workspace
drop policy if exists companies_select_member on public.companies;
create policy companies_select_member
on public.companies
for select
to authenticated
using (public.is_company_member(id));

-- Any authenticated user can create a workspace (they become owner via company_members bootstrap)
drop policy if exists companies_insert_authenticated on public.companies;
create policy companies_insert_authenticated
on public.companies
for insert
to authenticated
with check (created_by = auth.uid());

-- Only company admins can update workspace settings
drop policy if exists companies_update_admin on public.companies;
create policy companies_update_admin
on public.companies
for update
to authenticated
using (public.is_company_admin(id))
with check (public.is_company_admin(id));

-- Best practice: only owners can delete a workspace (admins can manage, but deletion is owner-only)
drop policy if exists companies_delete_owner on public.companies;
create policy companies_delete_owner
on public.companies
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = public.companies.id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  )
);

-- Products
alter table public.products enable row level security;

-- Company members can read products in their workspace
drop policy if exists products_select_company_member on public.products;
create policy products_select_company_member
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = public.products.company_id
      and cm.user_id = auth.uid()
  )
);

-- Only company admins can create/update/delete products
drop policy if exists products_insert_company_admin on public.products;
create policy products_insert_company_admin
on public.products
for insert
to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists products_update_company_admin on public.products;
create policy products_update_company_admin
on public.products
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists products_delete_company_admin on public.products;
create policy products_delete_company_admin
on public.products
for delete
to authenticated
using (public.is_company_admin(company_id));

-- Product competitors (treated as product settings; restrict to admins)
-- If your schema doesn't have this table yet, these statements can be skipped safely.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'product_competitors'
  ) then
    execute 'alter table public.product_competitors enable row level security';

    execute 'drop policy if exists product_competitors_select_member on public.product_competitors';
    execute $p$
      create policy product_competitors_select_member
      on public.product_competitors
      for select
      to authenticated
      using (public.is_product_member(product_id))
    $p$;

    execute 'drop policy if exists product_competitors_insert_admin on public.product_competitors';
    execute $p$
      create policy product_competitors_insert_admin
      on public.product_competitors
      for insert
      to authenticated
      with check (public.is_product_admin(product_id))
    $p$;

    execute 'drop policy if exists product_competitors_update_admin on public.product_competitors';
    execute $p$
      create policy product_competitors_update_admin
      on public.product_competitors
      for update
      to authenticated
      using (public.is_product_admin(product_id))
      with check (public.is_product_admin(product_id))
    $p$;

    execute 'drop policy if exists product_competitors_delete_admin on public.product_competitors';
    execute $p$
      create policy product_competitors_delete_admin
      on public.product_competitors
      for delete
      to authenticated
      using (public.is_product_admin(product_id))
    $p$;
  end if;
end $$;


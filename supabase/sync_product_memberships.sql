-- One-time + runtime sync: backfill product_members for users who joined before
-- product-level membership existed. Call from app: rpc('sync_my_product_memberships').
--
-- Run after: product_memberships_and_product_limits.sql

create or replace function public.sync_my_product_memberships()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Company owners/admins: grant access to all products in their companies.
  insert into public.product_members (product_id, user_id, role)
  select p.id, cm.user_id,
    case cm.role
      when 'owner' then 'owner'
      when 'admin' then 'admin'
      else 'member'
    end
  from public.company_members cm
  join public.products p on p.company_id = cm.company_id
  where cm.user_id = auth.uid()
    and cm.role in ('owner', 'admin')
  on conflict (product_id, user_id) do nothing;

  -- Plain members: if they have no product in this company yet, attach the first product (by created_at).
  insert into public.product_members (product_id, user_id, role)
  select fp.id, cm.user_id, 'member'
  from public.company_members cm
  join lateral (
    select p2.id
    from public.products p2
    where p2.company_id = cm.company_id
    order by p2.created_at asc nulls last
    limit 1
  ) fp on true
  where cm.user_id = auth.uid()
    and cm.role = 'member'
    and not exists (
      select 1
      from public.product_members pm
      join public.products px on px.id = pm.product_id
      where pm.user_id = cm.user_id
        and px.company_id = cm.company_id
    );
end;
$$;

revoke all on function public.sync_my_product_memberships() from public;
grant execute on function public.sync_my_product_memberships() to authenticated;

-- Allow company members to read products (needed for lists / profile before membership rows exist).
drop policy if exists products_select_company_member on public.products;
create policy products_select_company_member on public.products
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

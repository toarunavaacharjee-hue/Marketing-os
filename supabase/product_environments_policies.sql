-- Product environments: allow product admins to manage environments.
-- Run after: product_memberships_and_product_limits.sql (for is_product_admin helper)

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'product_environments'
  ) then
    execute 'alter table public.product_environments enable row level security';

    -- Members can read environments for products they can access.
    execute 'drop policy if exists product_environments_select_member on public.product_environments';
    execute $p$
      create policy product_environments_select_member
      on public.product_environments
      for select
      to authenticated
      using (public.is_product_member(product_id))
    $p$;

    -- Admins can insert/update/delete.
    execute 'drop policy if exists product_environments_insert_admin on public.product_environments';
    execute $p$
      create policy product_environments_insert_admin
      on public.product_environments
      for insert
      to authenticated
      with check (public.is_product_admin(product_id))
    $p$;

    execute 'drop policy if exists product_environments_update_admin on public.product_environments';
    execute $p$
      create policy product_environments_update_admin
      on public.product_environments
      for update
      to authenticated
      using (public.is_product_admin(product_id))
      with check (public.is_product_admin(product_id))
    $p$;

    execute 'drop policy if exists product_environments_delete_admin on public.product_environments';
    execute $p$
      create policy product_environments_delete_admin
      on public.product_environments
      for delete
      to authenticated
      using (public.is_product_admin(product_id))
    $p$;
  end if;
end $$;


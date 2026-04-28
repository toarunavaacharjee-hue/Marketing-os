-- Fix RLS recursion ("stack depth limit exceeded") by making membership helpers SECURITY DEFINER.
--
-- When helper functions query a table that has RLS enabled, and policies on that table
-- also call the helper, Postgres can recurse until stack overflow.
--
-- SECURITY DEFINER functions owned by the schema owner bypass RLS (unless FORCE RLS),
-- which breaks the recursion and restores expected behavior.
--
-- Safe to run multiple times.

-- Company membership helpers
create or replace function public.is_company_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = cid
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = cid
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  );
$$;

-- Product membership helpers
create or replace function public.is_product_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_members pm
    where pm.product_id = pid
      and pm.user_id = auth.uid()
      and pm.role in ('owner','admin')
  );
$$;


-- Company subscriptions (per-tenant plan + seat limits)
-- Run this in Supabase SQL Editor.
--
-- Prereqs:
-- - `companies` table exists
-- - `company_members` table exists
-- - helper functions from `team_governance_and_support.sql` exist:
--   - public.is_company_member(uuid)
--   - public.is_company_admin(uuid)

create table if not exists public.company_subscriptions (
  company_id uuid primary key references public.companies(id) on delete cascade,
  plan text not null default 'starter',
  status text not null default 'active',
  seats_included int not null default 1,
  seats_addon int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_subscriptions_plan_check') then
    alter table public.company_subscriptions
      add constraint company_subscriptions_plan_check
      check (plan in ('starter','growth','enterprise'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_subscriptions_status_check') then
    alter table public.company_subscriptions
      add constraint company_subscriptions_status_check
      check (status in ('trialing','active','past_due','canceled'));
  end if;
end $$;

create or replace function public.set_company_subscription_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_subscriptions_updated_at on public.company_subscriptions;
create trigger trg_company_subscriptions_updated_at
before update on public.company_subscriptions
for each row execute function public.set_company_subscription_updated_at();

alter table public.company_subscriptions enable row level security;

drop policy if exists company_subscriptions_select_member on public.company_subscriptions;
create policy company_subscriptions_select_member on public.company_subscriptions
for select to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_subscriptions_insert_admin on public.company_subscriptions;
create policy company_subscriptions_insert_admin on public.company_subscriptions
for insert to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists company_subscriptions_update_admin on public.company_subscriptions;
create policy company_subscriptions_update_admin on public.company_subscriptions
for update to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));


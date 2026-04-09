-- Marketing OS: Backfill workspace subscriptions + deprecate legacy profiles.plan
--
-- What this does:
-- 1) Ensures every company has a company_subscriptions row (starter/active defaults).
-- 2) Optionally clears per-user legacy plan values in profiles.plan (safe to rerun).
--
-- Run in Supabase SQL Editor.

-- 1) Backfill company_subscriptions for any companies missing it
insert into public.company_subscriptions (
  company_id,
  plan,
  status,
  seats_included,
  seats_addon,
  products_included,
  products_addon
)
select
  c.id as company_id,
  'starter' as plan,
  'active' as status,
  1 as seats_included,
  0 as seats_addon,
  1 as products_included,
  0 as products_addon
from public.companies c
left join public.company_subscriptions s on s.company_id = c.id
where s.company_id is null;

-- 2) Clear legacy per-user plan values (profiles.plan)
-- Note: This does NOT affect access control (workspace plans are in company_subscriptions).
update public.profiles
set plan = null
where plan is not null;


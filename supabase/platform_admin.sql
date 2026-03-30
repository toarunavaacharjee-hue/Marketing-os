-- Platform operator flag + profile timestamps (run in Supabase SQL Editor)
--
-- After this migration runs, grant yourself operator access using ONE of:
--
-- (1) By email (replace the email with yours — keep the quotes):
--     update public.profiles
--     set is_platform_admin = true
--     where id = (select id from auth.users where email = 'you@example.com' limit 1);
--
-- (2) By UUID: copy a real id from Dashboard → Authentication → Users, or run:
--     select id, email from auth.users order by created_at desc;
--     Then run (replace 00000000-... with that id, no angle brackets):
--     update public.profiles set is_platform_admin = true
--     where id = '00000000-0000-0000-0000-000000000000'::uuid;
--
-- Do not paste placeholder text like <your-user-uuid> — Postgres expects a valid uuid.

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

alter table public.profiles
  add column if not exists created_at timestamptz default now();

comment on column public.profiles.is_platform_admin is
  'When true, user may open /operator (server-verified). Never expose in client bundles.';

update public.profiles
set created_at = coalesce(created_at, now())
where created_at is null;

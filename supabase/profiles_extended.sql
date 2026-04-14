-- Extend profiles with richer, client-facing account fields.
-- Safe to run multiple times due to IF NOT EXISTS guards.

do $$
begin
  alter table public.profiles
    add column if not exists display_name text;

  alter table public.profiles
    add column if not exists job_title text;

  alter table public.profiles
    add column if not exists phone text;

  alter table public.profiles
    add column if not exists timezone text;

  alter table public.profiles
    add column if not exists locale text;

  alter table public.profiles
    add column if not exists avatar_url text;
exception
  when undefined_table then
    -- If your project hasn't created public.profiles yet, run your base auth/profile migration first.
    raise notice 'public.profiles does not exist; skipping profiles_extended.sql';
end $$;


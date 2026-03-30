-- Marketing OS: Team governance + Support tickets (RLS)
-- Run in Supabase SQL Editor after your base schema (companies/company_members/profiles exist).

-- 1) Ensure company_members.role exists + is constrained to known roles
-- (If your table already has a role column, this is a no-op.)
alter table public.company_members
  add column if not exists role text not null default 'member';

-- Optional: keep role values clean (safe if constraint already exists with same name)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_members_role_check'
  ) then
    alter table public.company_members
      add constraint company_members_role_check
      check (role in ('owner','admin','member'));
  end if;
end $$;

-- 2) Helper functions
create or replace function public.is_company_member(cid uuid)
returns boolean
language sql
stable
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
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = cid
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin')
  );
$$;

-- 3) RLS for company_members (viewable by members; writable by admins)
alter table public.company_members enable row level security;

drop policy if exists company_members_select_member on public.company_members;
create policy company_members_select_member
on public.company_members
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_members_insert_admin on public.company_members;
create policy company_members_insert_admin
on public.company_members
for insert
to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists company_members_update_admin on public.company_members;
create policy company_members_update_admin
on public.company_members
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists company_members_delete_admin on public.company_members;
create policy company_members_delete_admin
on public.company_members
for delete
to authenticated
using (public.is_company_admin(company_id));

-- 4) Support tickets (in-app support tier surface)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open', -- open | triaged | waiting | closed
  priority text not null default 'normal', -- normal | priority
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_company_created_idx
  on public.support_tickets(company_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_select_member on public.support_tickets;
create policy support_tickets_select_member
on public.support_tickets
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists support_tickets_insert_member on public.support_tickets;
create policy support_tickets_insert_member
on public.support_tickets
for insert
to authenticated
with check (
  public.is_company_member(company_id)
  and created_by = auth.uid()
);

drop policy if exists support_tickets_update_admin on public.support_tickets;
create policy support_tickets_update_admin
on public.support_tickets
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));


-- Marketing OS: Company invites (email-less, link-based) + RLS
-- Run after base schema + team_governance_and_support.sql

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'member', -- owner|admin|member (owner invites are allowed but discouraged)
  token text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz
);

create index if not exists company_invites_company_created_idx
  on public.company_invites(company_id, created_at desc);

alter table public.company_invites enable row level security;

-- Uses functions from team_governance_and_support.sql:
-- public.is_company_member(cid uuid)
-- public.is_company_admin(cid uuid)

drop policy if exists company_invites_select_member on public.company_invites;
create policy company_invites_select_member
on public.company_invites
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_invites_insert_admin on public.company_invites;
create policy company_invites_insert_admin
on public.company_invites
for insert
to authenticated
with check (public.is_company_admin(company_id) and created_by = auth.uid());

drop policy if exists company_invites_update_admin on public.company_invites;
create policy company_invites_update_admin
on public.company_invites
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists company_invites_delete_admin on public.company_invites;
create policy company_invites_delete_admin
on public.company_invites
for delete
to authenticated
using (public.is_company_admin(company_id));

-- Accept invite via RPC (avoids needing service-role in app code).
-- Uses email claim from auth.jwt() to ensure the invite is for the signed-in user.
create or replace function public.accept_company_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.company_invites%rowtype;
  v_email text;
  v_now timestamptz := now();
begin
  v_email := lower(coalesce((auth.jwt() ->> 'email'), ''));
  if v_email = '' then
    raise exception 'Missing email in session.';
  end if;

  select *
  into v_inv
  from public.company_invites
  where token = invite_token
  limit 1;

  if v_inv.id is null then
    raise exception 'Invite not found.';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'Invite was revoked.';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Invite already accepted.';
  end if;

  if v_inv.expires_at <= v_now then
    raise exception 'Invite expired.';
  end if;

  if lower(v_inv.email) <> v_email then
    raise exception 'Invite email does not match signed-in user.';
  end if;

  insert into public.company_members(company_id, user_id, role)
  values (v_inv.company_id, auth.uid(), v_inv.role)
  on conflict (company_id, user_id) do update set role = excluded.role;

  update public.company_invites
  set accepted_at = v_now, accepted_by = auth.uid()
  where id = v_inv.id;

  return jsonb_build_object('ok', true, 'company_id', v_inv.company_id);
end;
$$;

revoke all on function public.accept_company_invite(text) from public;
grant execute on function public.accept_company_invite(text) to authenticated;


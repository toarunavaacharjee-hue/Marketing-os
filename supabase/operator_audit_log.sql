-- Marketing OS: Operator audit log (platform admin)
-- Run in Supabase SQL Editor after `platform_admin.sql` (profiles.is_platform_admin exists).

create table if not exists public.operator_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Actor (platform operator)
  operator_user_id uuid not null references public.profiles(id) on delete restrict,

  -- What happened
  action text not null,
  target_type text not null,
  target_id text not null,

  -- Optional structured context and diffs
  metadata_json jsonb not null default '{}'::jsonb,
  before_json jsonb,
  after_json jsonb,

  -- Request context (best-effort; set by API)
  ip text,
  user_agent text
);

create index if not exists operator_audit_log_created_at_idx
  on public.operator_audit_log (created_at desc);

create index if not exists operator_audit_log_target_idx
  on public.operator_audit_log (target_type, target_id, created_at desc);

create index if not exists operator_audit_log_actor_idx
  on public.operator_audit_log (operator_user_id, created_at desc);

alter table public.operator_audit_log enable row level security;

-- Platform admins can read audit logs even with anon-session clients (RLS applies).
drop policy if exists operator_audit_log_select_platform_admin on public.operator_audit_log;
create policy operator_audit_log_select_platform_admin
on public.operator_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_platform_admin = true
  )
);

-- No insert/update/delete policies: browser clients cannot mutate audit logs.
-- Operator APIs should write via the server using the service role.


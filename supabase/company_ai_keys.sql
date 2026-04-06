-- Per-workspace Anthropic API key (ciphertext only). Read/write from app server using
-- SUPABASE_SERVICE_ROLE_KEY after verifying the user is a workspace member/admin.
--
-- Required once per Supabase project: Dashboard → SQL → New query → paste → Run.

create table if not exists public.company_ai_keys (
  company_id uuid primary key references public.companies(id) on delete cascade,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

create index if not exists company_ai_keys_updated_idx
  on public.company_ai_keys (updated_at desc);

alter table public.company_ai_keys enable row level security;

-- No policies for anon/authenticated: clients cannot read ciphertext via PostgREST.
-- Server uses service role to access this table.

comment on table public.company_ai_keys is 'Encrypted Anthropic API keys per workspace; server-only access via service role.';

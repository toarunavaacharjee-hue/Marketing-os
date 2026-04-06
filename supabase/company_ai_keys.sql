-- Marketing OS: Encrypted workspace Anthropic keys (BYOK)
-- Run in Supabase SQL Editor after public.companies exists (e.g. after team_governance_and_support.sql).
-- App reads/writes via SUPABASE_SERVICE_ROLE_KEY only; anon/authenticated have no policies on this table.

create table if not exists public.company_ai_keys (
  company_id uuid primary key references public.companies(id) on delete cascade,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

create index if not exists company_ai_keys_updated_idx
  on public.company_ai_keys (updated_at desc);

alter table public.company_ai_keys enable row level security;

-- Intentionally no policies for anon/authenticated: PostgREST cannot read ciphertext from the browser.
-- The Next.js server uses the service role client after session checks.

comment on table public.company_ai_keys is 'Encrypted Anthropic API keys per workspace; server-only access via service role.';
comment on column public.company_ai_keys.ciphertext is 'AES-GCM payload from workspaceKeyCrypto (WORKSPACE_AI_KEY_ENCRYPTION_SECRET).';

-- Migration for existing projects that already created sync_runs/assets
-- Adds is_demo flags so the UI can label demo-seeded data.

alter table public.sync_runs add column if not exists is_demo boolean not null default false;
alter table public.assets add column if not exists is_demo boolean not null default false;


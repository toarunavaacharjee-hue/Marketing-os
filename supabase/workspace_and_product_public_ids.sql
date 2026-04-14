-- Human-friendly public IDs for workspaces (companies) and products.
-- Adds `public_id` columns, backfills existing rows, enforces uniqueness, and auto-generates on insert.

create extension if not exists pgcrypto;

create or replace function public.generate_public_id(prefix text, bytes_len int default 5)
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  -- 5 bytes -> 10 hex chars (40 bits). With prefix: ws_XXXXXXXXXX / prd_XXXXXXXXXX
  candidate := lower(prefix) || '_' || encode(gen_random_bytes(bytes_len), 'hex');
  return candidate;
end $$;

do $$
begin
  -- Workspaces
  alter table public.companies
    add column if not exists public_id text;

  -- Products
  alter table public.products
    add column if not exists public_id text;

  -- Unique constraints
  if not exists (select 1 from pg_constraint where conname = 'companies_public_id_unique') then
    alter table public.companies add constraint companies_public_id_unique unique (public_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_public_id_unique') then
    alter table public.products add constraint products_public_id_unique unique (public_id);
  end if;
exception
  when undefined_table then
    raise notice 'companies/products tables do not exist yet; skipping public_id migration';
end $$;

-- Backfill (best-effort, collision-safe)
do $$
declare
  r record;
  v text;
begin
  for r in (select id from public.companies where public_id is null) loop
    loop
      v := public.generate_public_id('ws', 5);
      exit when not exists (select 1 from public.companies where public_id = v);
    end loop;
    update public.companies set public_id = v where id = r.id;
  end loop;

  for r in (select id from public.products where public_id is null) loop
    loop
      v := public.generate_public_id('prd', 5);
      exit when not exists (select 1 from public.products where public_id = v);
    end loop;
    update public.products set public_id = v where id = r.id;
  end loop;
exception
  when undefined_table then
    -- ignore
end $$;

-- Insert triggers (auto-populate public_id if missing)
create or replace function public.set_public_id_company()
returns trigger
language plpgsql
as $$
begin
  if new.public_id is null or length(trim(new.public_id)) = 0 then
    loop
      new.public_id := public.generate_public_id('ws', 5);
      exit when not exists (select 1 from public.companies where public_id = new.public_id);
    end loop;
  end if;
  return new;
end $$;

create or replace function public.set_public_id_product()
returns trigger
language plpgsql
as $$
begin
  if new.public_id is null or length(trim(new.public_id)) = 0 then
    loop
      new.public_id := public.generate_public_id('prd', 5);
      exit when not exists (select 1 from public.products where public_id = new.public_id);
    end loop;
  end if;
  return new;
end $$;

do $$
begin
  drop trigger if exists trg_companies_set_public_id on public.companies;
  create trigger trg_companies_set_public_id
  before insert on public.companies
  for each row
  execute function public.set_public_id_company();

  drop trigger if exists trg_products_set_public_id on public.products;
  create trigger trg_products_set_public_id
  before insert on public.products
  for each row
  execute function public.set_public_id_product();
exception
  when undefined_table then
    -- ignore
end $$;


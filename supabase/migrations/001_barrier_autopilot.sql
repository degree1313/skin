-- Barrier Autopilot - Phase 1 schema

-- Ensure UUID generation is available
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'active_category') then
    create type public.active_category as enum (
      'retinoid',
      'aha',
      'bha',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'dose') then
    create type public.dose as enum (
      'half_pea',
      'pea',
      'dime',
      'one_pump',
      'two_pumps'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'routine_slot') then
    create type public.routine_slot as enum (
      'am',
      'pm'
    );
  end if;
end
$$;

-- Products owned by a specific user
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  active_category public.active_category not null,
  created_at timestamptz not null default now()
);

-- Usage logs for products
create table if not exists public.product_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  routine_slot public.routine_slot not null,
  dose public.dose not null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_products_user_id
  on public.products (user_id);

create index if not exists idx_product_usage_logs_user_id_used_at
  on public.product_usage_logs (user_id, used_at desc);

-- Row Level Security
alter table public.products enable row level security;
alter table public.product_usage_logs enable row level security;

-- Policies: users can only see and mutate their own rows
create policy if not exists "Users can CRUD own products"
  on public.products
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can CRUD own product usage logs"
  on public.product_usage_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


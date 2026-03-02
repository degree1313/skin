-- User profiles (skin type for skin analysis)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'skin_type') then
    create type public.skin_type as enum (
      'oily',
      'combination',
      'dry',
      'normal'
    );
  end if;
end
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skin_type public.skin_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_user_profiles_user_id
  on public.user_profiles (user_id);

alter table public.user_profiles enable row level security;

create policy if not exists "Users can CRUD own user_profiles"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

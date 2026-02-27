-- Daily check-ins to estimate recovery capacity

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stinging_level int not null default 0,
  stinging_minutes int not null default 0,
  tightness boolean not null default false,
  flaking_severity int not null default 0,
  itchiness_level int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_checkins_user_id_created_at_desc
  on public.daily_checkins (user_id, created_at desc);

alter table public.daily_checkins enable row level security;

create policy if not exists "Users can CRUD own daily_checkins"
  on public.daily_checkins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


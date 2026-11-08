create table public.cruise_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  ship text,
  itinerary_notes text,
  created_at timestamptz not null default now(),
  constraint cruise_weeks_dates_check check (end_date >= start_date)
);

create index cruise_weeks_user_id_idx on public.cruise_weeks (user_id);

alter table public.cruise_weeks enable row level security;

create policy "Users manage their own cruise weeks"
  on public.cruise_weeks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
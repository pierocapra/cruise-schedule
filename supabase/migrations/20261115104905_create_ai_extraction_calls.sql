create table public.ai_extraction_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_extraction_calls_user_id_created_at_idx
  on public.ai_extraction_calls (user_id, created_at);

alter table public.ai_extraction_calls enable row level security;

create policy "ai_extraction_calls_owner"
  on public.ai_extraction_calls
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

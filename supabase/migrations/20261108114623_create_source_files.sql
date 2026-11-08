create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  cruise_week_id uuid
    references public.cruise_weeks (id) on delete set null,
  file_name text not null,
  file_type text not null
    check (file_type in ('pdf', 'spreadsheet', 'text')),
  storage_path text,
  raw_text text,
  created_at timestamptz not null default now(),
  constraint source_files_has_content
    check (storage_path is not null or raw_text is not null)
);

create index if not exists source_files_user_id_idx
  on public.source_files (user_id);

create index if not exists source_files_cruise_week_id_idx
  on public.source_files (cruise_week_id);

alter table public.source_files enable row level security;

drop policy if exists "Users manage their own source files"
  on public.source_files;

create policy "Users manage their own source files"
  on public.source_files
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      cruise_week_id is null
      or exists (
        select 1 from public.cruise_weeks w
        where w.id = cruise_week_id
          and w.user_id = (select auth.uid())
      )
    )
  );
-- extracted_events: the events the AI extracts from a source file.
-- Times are ship wall-clock as printed in the schedule (never timestamptz).
-- Keep the type list in sync with the Zod schema.

-- Target for the composite foreign key below (id is already unique;
-- this lets (id, user_id) be referenced as a pair).
alter table public.source_files
  add constraint source_files_id_user_id_key unique (id, user_id);

create table public.extracted_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  source_file_id uuid not null,
  event_date date not null,
  start_time time,
  end_time time,
  ends_next_day boolean not null default false,
  venue text,
  type text not null,
  department text,
  notes text,
  source_snippet text not null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),

  constraint extracted_events_source_file_fkey
    foreign key (source_file_id, user_id)
    references public.source_files (id, user_id)
    on delete no action,

  constraint extracted_events_type_check
    check (type in ('show', 'rehearsal', 'tech_call', 'other')),
  constraint extracted_events_end_after_start
    check (
      end_time is null
      or start_time is null
      or ends_next_day
      or end_time > start_time
    ),
  constraint extracted_events_next_day_needs_end
    check (not ends_next_day or end_time is not null),
  constraint extracted_events_venue_length
    check (char_length(venue) <= 200),
  constraint extracted_events_department_length
    check (char_length(department) <= 200),
  constraint extracted_events_notes_length
    check (char_length(notes) <= 1000),
  constraint extracted_events_snippet_length
    check (char_length(source_snippet) <= 2000),
  constraint extracted_events_snippet_not_blank
    check (char_length(btrim(source_snippet)) > 0)
);

create index extracted_events_user_id_idx
  on public.extracted_events (user_id);
create index extracted_events_source_file_id_idx
  on public.extracted_events (source_file_id);

alter table public.extracted_events enable row level security;

create policy "extracted_events_owner_all"
  on public.extracted_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

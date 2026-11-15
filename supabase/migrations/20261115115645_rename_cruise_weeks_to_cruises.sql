-- A cruise can last any number of days, so "cruise week" becomes "cruise",
-- and every source file now belongs to exactly one cruise.

-- 1. Rename the table and everything that still carries the old name.
alter table public.cruise_weeks rename to cruises;

alter table public.cruises rename constraint cruise_weeks_pkey to cruises_pkey;
alter table public.cruises rename constraint cruise_weeks_user_id_fkey to cruises_user_id_fkey;
alter table public.cruises rename constraint cruise_weeks_dates_check to cruises_dates_check;
alter index public.cruise_weeks_user_id_idx rename to cruises_user_id_idx;

alter policy "Users manage their own cruise weeks" on public.cruises
  rename to "Users manage their own cruises";

-- 2. The target of the composite foreign key added in step 5.
alter table public.cruises
  add constraint cruises_id_user_id_key unique (id, user_id);

-- 3. Drop the old FK (ON DELETE SET NULL), then rename the column and index.
alter table public.source_files drop constraint source_files_cruise_week_id_fkey;
alter table public.source_files rename column cruise_week_id to cruise_id;
alter index public.source_files_cruise_week_id_idx rename to source_files_cruise_id_idx;

-- 4. Give every existing source a cruise. Placeholder dates; edit them later.
insert into public.cruises (user_id, start_date, end_date, itinerary_notes)
select distinct s.user_id, current_date, current_date + 6,
  'Created automatically for sources uploaded before cruises existed.'
from public.source_files s
where s.cruise_id is null;

update public.source_files s
set cruise_id = c.id
from public.cruises c
where s.cruise_id is null
  and c.user_id = s.user_id
  and c.itinerary_notes = 'Created automatically for sources uploaded before cruises existed.';

-- 5. Make the relationship mandatory and enforced.
alter table public.source_files alter column cruise_id set not null;

alter table public.source_files
  add constraint source_files_cruise_id_user_id_fkey
  foreign key (cruise_id, user_id)
  references public.cruises (id, user_id)
  on delete no action;

-- 6. The FK now guarantees the cruise belongs to the same user, so the policy
--    goes back to the standard shape used on every other table.
drop policy "Users manage their own source files" on public.source_files;

create policy "Users manage their own source files"
  on public.source_files
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

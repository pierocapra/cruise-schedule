-- A per-cruise "Manual entries" pseudo-source holds events a person adds by
-- hand, so every event still belongs to a source_files row.
-- Keep 'manual' in sync with the app code (src/lib/extraction/manual-source.ts).

alter table public.source_files
  drop constraint source_files_file_type_check;

alter table public.source_files
  add constraint source_files_file_type_check
    check (file_type in ('pdf', 'spreadsheet', 'text', 'manual'));

-- A manual source never has an uploaded file. (has_content already forces
-- raw_text to be non-null in that case.)
alter table public.source_files
  add constraint source_files_manual_has_no_file
    check (file_type <> 'manual' or storage_path is null);

-- At most one manual source per cruise. The action relies on this to stay
-- correct if two "add event" requests race.
create unique index source_files_one_manual_per_cruise
  on public.source_files (cruise_id)
  where file_type = 'manual';
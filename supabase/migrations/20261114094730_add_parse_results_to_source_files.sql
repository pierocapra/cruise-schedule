-- Parse results for source_files.
-- parsed_at is null until the file has been through parseSource.

alter table public.source_files
  add column parse_warnings text[] not null default '{}',
  add column needs_ocr boolean not null default false,
  add column parsed_at timestamptz;

alter table public.source_files
  add constraint source_files_needs_ocr_requires_parsed
  check (needs_ocr = false or parsed_at is not null);

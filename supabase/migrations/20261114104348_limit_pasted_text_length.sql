-- Pasted text has no Storage object, so no bucket size limit applies.
-- Keep in sync with MAX_PASTED_CHARS in src/lib/ingest/prepare-pasted-text.ts.
-- Rows backed by a file are exempt: parsed files can produce more text.

alter table public.source_files
  add constraint source_files_pasted_text_max_length
  check (storage_path is not null or char_length(raw_text) <= 100000);

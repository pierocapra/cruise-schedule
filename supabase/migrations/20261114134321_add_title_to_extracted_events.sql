-- The event's own name as printed in the source, e.g.
-- "Starlight - Production Show". Keep the limit in sync with
-- MAX_TITLE_CHARS in src/lib/extraction/event-schema.ts.
-- No default: this fails if the table still contains rows.

alter table public.extracted_events
  add column title text not null,
  add constraint extracted_events_title_length
    check (char_length(title) <= 200),
  add constraint extracted_events_title_not_blank
    check (char_length(btrim(title)) > 0);

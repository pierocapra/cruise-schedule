-- Archived cruises are hidden from the main list but keep all their data.
-- null = active; the timestamp records when it was archived.

alter table public.cruises
  add column archived_at timestamptz;
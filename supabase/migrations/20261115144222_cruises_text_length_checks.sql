-- Keep in sync with MAX_SHIP_CHARS and MAX_ITINERARY_NOTES_CHARS in
-- src/lib/cruises/cruise-schema.ts.

alter table public.cruises
  add constraint cruises_ship_length
  check (ship is null or (char_length(ship) <= 100 and char_length(trim(ship)) > 0));

alter table public.cruises
  add constraint cruises_itinerary_notes_length
  check (itinerary_notes is null or char_length(itinerary_notes) <= 2000);

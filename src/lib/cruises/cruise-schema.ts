import { z } from "zod";

import { DATE_PATTERN, inclusiveDayCount, isRealIsoDate } from "../dates";

// Keep in sync with cruises_ship_length and cruises_itinerary_notes_length
// in the database.
export const MAX_SHIP_CHARS = 100;
export const MAX_ITINERARY_NOTES_CHARS = 2000;

// Application-level only, not a database constraint. Catches a typo'd year
// or end date before it reaches the scheduling phases. Easy to raise later.
export const MAX_CRUISE_DAYS = 200;

/**
 * The fields of a cruise, as a form or action must send them. Plain
 * formats and length limits only; cross-field rules live in cruiseSchema.
 */
export const cruiseFieldsSchema = z.object({
  ship: z
    .string()
    .trim()
    .min(1, "Ship name is required")
    .max(MAX_SHIP_CHARS, `Ship name must be ${MAX_SHIP_CHARS} characters or fewer`),
  start_date: z.string().regex(DATE_PATTERN, "Use the format YYYY-MM-DD"),
  end_date: z.string().regex(DATE_PATTERN, "Use the format YYYY-MM-DD"),
  itinerary_notes: z
    .string()
    .max(
      MAX_ITINERARY_NOTES_CHARS,
      `Notes must be ${MAX_ITINERARY_NOTES_CHARS} characters or fewer`,
    )
    .nullable(),
});

// A field that already failed its format check is reported once, there.
// Returning true for malformed input avoids reporting the same mistake twice.
function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return true;
  return isRealIsoDate(value);
}

function withinMaxLength(start: string, end: string): boolean {
  if (!isRealIsoDate(start) || !isRealIsoDate(end)) return true;
  if (end < start) return true; // reported by the end-after-start rule instead
  return inclusiveDayCount(start, end) <= MAX_CRUISE_DAYS;
}

export const cruiseSchema = cruiseFieldsSchema
  .refine((c) => isRealDate(c.start_date), {
    message: "That start date does not exist",
    path: ["start_date"],
  })
  .refine((c) => isRealDate(c.end_date), {
    message: "That end date does not exist",
    path: ["end_date"],
  })
  .refine(
    (c) =>
      !isRealIsoDate(c.start_date) ||
      !isRealIsoDate(c.end_date) ||
      c.end_date >= c.start_date,
    {
      message: "The end date cannot be before the start date",
      path: ["end_date"],
    },
  )
  .refine((c) => withinMaxLength(c.start_date, c.end_date), {
    message: `A cruise cannot be longer than ${MAX_CRUISE_DAYS} days. Check the dates.`,
    path: ["end_date"],
  });

export type CruiseInput = z.infer<typeof cruiseSchema>;

function blankToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Turns a blank notes field into null (forms send "" for an empty textarea). */
export function normalizeCruise(cruise: CruiseInput): CruiseInput {
  return {
    ...cruise,
    ship: cruise.ship.trim(),
    itinerary_notes: blankToNull(cruise.itinerary_notes),
  };
}
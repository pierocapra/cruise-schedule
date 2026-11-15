import { describe, expect, it } from "vitest";

import {
  cruiseSchema,
  MAX_CRUISE_DAYS,
  MAX_ITINERARY_NOTES_CHARS,
  MAX_SHIP_CHARS,
  normalizeCruise,
} from "./cruise-schema";

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ship: "MS Example",
    start_date: "2026-11-07",
    end_date: "2026-11-13",
    itinerary_notes: null,
    ...overrides,
  };
}

describe("cruiseSchema", () => {
  it("accepts a valid week-long cruise", () => {
    const result = cruiseSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("accepts a single-day cruise", () => {
    const result = cruiseSchema.safeParse(
      validInput({ start_date: "2026-11-07", end_date: "2026-11-07" }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a 40-day cruise", () => {
    const result = cruiseSchema.safeParse(
      validInput({ start_date: "2026-11-01", end_date: "2026-12-10" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a blank ship name", () => {
    const result = cruiseSchema.safeParse(validInput({ ship: "   " }));
    expect(result.success).toBe(false);
  });

  it("rejects a ship name over the character limit", () => {
    const result = cruiseSchema.safeParse(
      validInput({ ship: "x".repeat(MAX_SHIP_CHARS + 1) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects notes over the character limit", () => {
    const result = cruiseSchema.safeParse(
      validInput({ itinerary_notes: "x".repeat(MAX_ITINERARY_NOTES_CHARS + 1) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a date that does not exist", () => {
    const result = cruiseSchema.safeParse(validInput({ start_date: "2026-02-30" }));
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = cruiseSchema.safeParse(
      validInput({ start_date: "2026-11-13", end_date: "2026-11-07" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["end_date"]);
    }
  });

  it("rejects a cruise longer than the cap", () => {
    const result = cruiseSchema.safeParse(
      validInput({ start_date: "2026-01-01", end_date: "2026-01-01" }),
    );
    expect(result.success).toBe(true); // sanity: 1 day is fine

    const tooLong = cruiseSchema.safeParse(
      validInput({ start_date: "2026-01-01", end_date: "2026-07-31" }), // 212 days
    );
    expect(tooLong.success).toBe(false);
  });

  it("accepts exactly the maximum length", () => {
    // 2026-01-01 plus (MAX_CRUISE_DAYS - 1) days.
    const end = new Date(Date.UTC(2026, 0, 1) + (MAX_CRUISE_DAYS - 1) * 86_400_000);
    const endIso = end.toISOString().slice(0, 10);

    const result = cruiseSchema.safeParse(
      validInput({ start_date: "2026-01-01", end_date: endIso }),
    );
    expect(result.success).toBe(true);
  });

  it("does not report the length cap when the dates are already malformed", () => {
    const result = cruiseSchema.safeParse(validInput({ start_date: "not-a-date" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).not.toContain("end_date");
    }
  });
});

describe("normalizeCruise", () => {
  it("trims the ship name", () => {
    const result = normalizeCruise(validInput({ ship: "  MS Example  " }) as never);
    expect(result.ship).toBe("MS Example");
  });

  it("turns blank notes into null", () => {
    const result = normalizeCruise(validInput({ itinerary_notes: "   " }) as never);
    expect(result.itinerary_notes).toBeNull();
  });

  it("keeps real notes", () => {
    const result = normalizeCruise(
      validInput({ itinerary_notes: "  Western Caribbean  " }) as never,
    );
    expect(result.itinerary_notes).toBe("Western Caribbean");
  });
});

import { describe, expect, it } from "vitest";

import {
  emptyCruiseFormValues,
  toCruiseFormValues,
  toCruiseInput,
} from "./cruise-form-values";

describe("emptyCruiseFormValues", () => {
  it("is all empty strings", () => {
    expect(emptyCruiseFormValues).toEqual({
      ship: "",
      start_date: "",
      end_date: "",
      itinerary_notes: "",
    });
  });
});

describe("toCruiseFormValues", () => {
  it("turns null ship and notes into empty strings", () => {
    expect(
      toCruiseFormValues({
        ship: null,
        start_date: "2026-02-10",
        end_date: "2026-02-17",
        itinerary_notes: null,
      }),
    ).toEqual({
      ship: "",
      start_date: "2026-02-10",
      end_date: "2026-02-17",
      itinerary_notes: "",
    });
  });
});

describe("toCruiseInput", () => {
  it("turns blank notes into null", () => {
    expect(
      toCruiseInput({
        ship: "MS Example",
        start_date: "2026-02-10",
        end_date: "2026-02-17",
        itinerary_notes: "   ",
      }).itinerary_notes,
    ).toBeNull();
  });

  it("keeps real notes and passes the ship through for the schema to trim", () => {
    expect(
      toCruiseInput({
        ship: " MS Example ",
        start_date: "2026-02-10",
        end_date: "2026-02-17",
        itinerary_notes: "Two sea days",
      }),
    ).toEqual({
      ship: " MS Example ",
      start_date: "2026-02-10",
      end_date: "2026-02-17",
      itinerary_notes: "Two sea days",
    });
  });
});
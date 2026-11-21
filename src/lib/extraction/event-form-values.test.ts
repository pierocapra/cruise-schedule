import { describe, expect, it } from "vitest";

import {
  emptyFormValues,
  toEdits,
  toFormValues,
} from "./event-form-values";

const event = {
  event_date: "2026-02-14",
  start_time: "19:30",
  end_time: "21:00",
  ends_next_day: false,
  venue: "Theatre",
  type: "show",
  title: "Starlight",
  notes: "Dress rehearsal first",
};

describe("emptyFormValues", () => {
  it("starts on the given date with the first type and empty text", () => {
    expect(emptyFormValues("2026-03-01")).toEqual({
      event_date: "2026-03-01",
      start_time: "",
      end_time: "",
      ends_next_day: false,
      venue: "",
      type: "show",
      title: "",
      notes: "",
    });
  });
});

describe("toFormValues", () => {
  it("turns nulls into empty strings and drops seconds from times", () => {
    expect(
      toFormValues({
        ...event,
        start_time: "19:30:00",
        end_time: null,
        venue: null,
        notes: null,
      }),
    ).toEqual({
      event_date: "2026-02-14",
      start_time: "19:30",
      end_time: "",
      ends_next_day: false,
      venue: "",
      type: "show",
      title: "Starlight",
      notes: "",
    });
  });
});

describe("toEdits", () => {
  it("turns empty times and blank text back into null", () => {
    expect(
      toEdits({
        ...toFormValues(event),
        start_time: "",
        end_time: "",
        venue: "   ",
        notes: "",
      }),
    ).toEqual({ ...event, start_time: null, end_time: null, venue: null, notes: null });
  });

  it("round-trips a full event unchanged", () => {
    expect(toEdits(toFormValues(event))).toEqual(event);
  });
});
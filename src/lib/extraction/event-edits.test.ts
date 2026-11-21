import { describe, expect, it } from "vitest";

import { prepareEventUpdate } from "./event-edits";

const existing = {
  department: "Production Theatre",
  source_snippet: "19:30 Starlight | Theatre",
};

const valid = {
  event_date: "2026-02-14",
  start_time: "19:30",
  end_time: "21:00",
  ends_next_day: false,
  venue: "Theatre",
  type: "show",
  title: "Starlight",
  notes: null,
};

describe("prepareEventUpdate", () => {
  it("accepts a valid edit and returns only the editable fields", () => {
    const result = prepareEventUpdate(valid, existing);

    expect(result).toEqual({ ok: true, fields: valid });
  });

  it("trims text and turns blank optional text into null", () => {
    const result = prepareEventUpdate(
      { ...valid, title: "  Starlight  ", venue: "   ", notes: "" },
      existing,
    );

    expect(result).toEqual({
      ok: true,
      fields: { ...valid, title: "Starlight", venue: null, notes: null },
    });
  });

  it("ignores department, source_snippet and reviewed sent by the client", () => {
    const result = prepareEventUpdate(
      { ...valid, department: "Hacked", source_snippet: "x", reviewed: true },
      existing,
    );

    // toEqual would fail if any of the three keys leaked into fields.
    expect(result).toEqual({ ok: true, fields: valid });
  });

  it("rejects a date that does not exist", () => {
    const result = prepareEventUpdate(
      { ...valid, event_date: "2026-02-30" },
      existing,
    );

    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("Date: That date does not exist"),
    });
  });

  it("rejects an end time before the start time", () => {
    const result = prepareEventUpdate(
      { ...valid, start_time: "21:00", end_time: "19:30" },
      existing,
    );

    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("End time: The end time must be after"),
    });
  });

  it("allows an earlier end time when the event ends the next day", () => {
    const result = prepareEventUpdate(
      { ...valid, start_time: "23:00", end_time: "01:00", ends_next_day: true },
      existing,
    );

    expect(result.ok).toBe(true);
  });

  it("rejects ends_next_day without an end time", () => {
    const result = prepareEventUpdate(
      { ...valid, end_time: null, ends_next_day: true },
      existing,
    );

    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("Ends next day:"),
    });
  });

  it("rejects a blank title", () => {
    const result = prepareEventUpdate({ ...valid, title: "   " }, existing);

    expect(result).toEqual({
      ok: false,
      message: "Title: The title is required",
    });
  });

  it("rejects an unknown type", () => {
    const result = prepareEventUpdate({ ...valid, type: "party" }, existing);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.startsWith("Type:")).toBe(true);
  });

  it("rejects an empty-string time (the form must send null)", () => {
    const result = prepareEventUpdate({ ...valid, start_time: "" }, existing);

    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("Start time:"),
    });
  });

  it("rejects input that is not an object", () => {
    expect(prepareEventUpdate("nope", existing)).toEqual({
      ok: false,
      message: "Invalid event data.",
    });
    expect(prepareEventUpdate(null, existing)).toEqual({
      ok: false,
      message: "Invalid event data.",
    });
  });
});
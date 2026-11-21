import { describe, expect, it } from "vitest";

import { findEventWarnings, normalizeTitle } from "./event-warnings";

const cruise = { start_date: "2026-02-10", end_date: "2026-02-24" };

const fileNames = new Map([
  ["f1", "Week 1.pdf"],
  ["f2", "Week 2.pdf"],
]);

function event(overrides: Partial<Parameters<typeof findEventWarnings>[0][number]> = {}) {
  return {
    id: "a",
    event_date: "2026-02-14",
    start_time: "19:30:00",
    title: "Starlight",
    source_file_id: "f1",
    ...overrides,
  };
}

describe("normalizeTitle", () => {
  it("lowercases and trims", () => {
    expect(normalizeTitle("  Starlight ")).toBe("starlight");
  });

  it("turns punctuation into single spaces", () => {
    expect(normalizeTitle("Starlight - Production  Show!")).toBe(
      "starlight production show",
    );
  });

  it("keeps accented letters and digits", () => {
    expect(normalizeTitle("Café 5")).toBe("café 5");
  });
});

describe("findEventWarnings", () => {
  it("returns nothing for ordinary events", () => {
    const result = findEventWarnings(
      [event(), event({ id: "b", title: "Other show" })],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(0);
  });

  it("flags a date before the cruise starts", () => {
    const result = findEventWarnings(
      [event({ event_date: "2026-02-09" })],
      cruise,
      fileNames,
    );

    expect(result.get("a")).toEqual([
      { kind: "outside_dates", message: "Outside the cruise dates" },
    ]);
  });

  it("flags a date after the cruise ends", () => {
    const result = findEventWarnings(
      [event({ event_date: "2026-02-25" })],
      cruise,
      fileNames,
    );

    expect(result.get("a")?.[0].kind).toBe("outside_dates");
  });

  it("does not flag the first and last day themselves", () => {
    const result = findEventWarnings(
      [
        event({ id: "a", event_date: "2026-02-10" }),
        event({ id: "b", event_date: "2026-02-24", title: "Closing" }),
      ],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(0);
  });

  it("flags duplicates across sources and names the other source", () => {
    const result = findEventWarnings(
      [event({ id: "a", source_file_id: "f1" }), event({ id: "b", source_file_id: "f2" })],
      cruise,
      fileNames,
    );

    expect(result.get("a")).toEqual([
      {
        kind: "duplicate",
        message: expect.stringContaining("Week 2.pdf"),
      },
    ]);
    expect(result.get("b")).toEqual([
      {
        kind: "duplicate",
        message: expect.stringContaining("Week 1.pdf"),
      },
    ]);
  });

  it("ignores case and punctuation when comparing titles", () => {
    const result = findEventWarnings(
      [
        event({ id: "a", title: "Starlight - Show" }),
        event({ id: "b", title: "STARLIGHT  show", source_file_id: "f2" }),
      ],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(2);
  });

  it("does not flag the same title at a different start time", () => {
    const result = findEventWarnings(
      [event({ id: "a" }), event({ id: "b", start_time: "21:30:00" })],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(0);
  });

  it("does not flag the same title and time on a different date", () => {
    const result = findEventWarnings(
      [event({ id: "a" }), event({ id: "b", event_date: "2026-02-15" })],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(0);
  });

  it("flags untimed events with the same date and title", () => {
    const result = findEventWarnings(
      [
        event({ id: "a", start_time: null }),
        event({ id: "b", start_time: null, source_file_id: "f2" }),
      ],
      cruise,
      fileNames,
    );

    expect(result.size).toBe(2);
  });

  it("lets one event carry both warnings, outside-dates first", () => {
    const result = findEventWarnings(
      [
        event({ id: "a", event_date: "2026-03-01" }),
        event({ id: "b", event_date: "2026-03-01", source_file_id: "f2" }),
      ],
      cruise,
      fileNames,
    );

    expect(result.get("a")?.map((w) => w.kind)).toEqual([
      "outside_dates",
      "duplicate",
    ]);
  });

  it("names each other source once when there are several copies", () => {
    const result = findEventWarnings(
      [
        event({ id: "a", source_file_id: "f1" }),
        event({ id: "b", source_file_id: "f2" }),
        event({ id: "c", source_file_id: "f2" }),
      ],
      cruise,
      fileNames,
    );

    const message = result.get("a")?.[0].message ?? "";
    expect(message.match(/Week 2\.pdf/g)).toHaveLength(1);
  });
});
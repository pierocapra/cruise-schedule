import { describe, expect, it } from "vitest";

import {
  type ExtractionParseResult,
  MAX_NOTES_CHARS,
  MAX_VENUE_CHARS,
  MAX_TITLE_CHARS,
  parseExtraction,
  parseExtractionJson,
} from "./event-schema";

const VALID = {
  event_date: "2026-11-14",
  start_time: "20:00",
  end_time: "21:00",
  ends_next_day: false,
  venue: "Theatre",
  type: "show",
  department: "Production",
  notes: null,
  source_snippet: "Sat 14 Nov 20:00 Main show, Theatre",
  title: "Main Show",
};

function event(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...VALID, ...overrides };
}

function expectOk(result: ExtractionParseResult) {
  if (!result.ok) {
    throw new Error(`Expected a parsed result, got: ${result.message}`);
  }
  return result;
}

// Runs one raw event through the public API, asserts it is rejected,
// and returns its problems as one string to search.
function problemsOf(raw: unknown): string {
  const result = expectOk(parseExtraction({ events: [raw] }));
  expect(result.events).toHaveLength(0);
  expect(result.rejected).toHaveLength(1);
  const [first] = result.rejected;
  return first ? first.problems.join("\n") : "";
}

describe("event validation", () => {
  it("accepts a valid event", () => {
    const result = expectOk(parseExtraction({ events: [event()] }));
    expect(result.events).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("accepts null times and null optional text", () => {
    const result = expectOk(
      parseExtraction({
        events: [
          event({
            start_time: null,
            end_time: null,
            venue: null,
            department: null,
            notes: null,
          }),
        ],
      }),
    );
    expect(result.events).toHaveLength(1);
  });

  it("rejects a date in the wrong format", () => {
    expect(problemsOf(event({ event_date: "14/11/2026" }))).toContain(
      "event_date",
    );
  });

  it("rejects a date that does not exist", () => {
    expect(problemsOf(event({ event_date: "2026-02-30" }))).toContain(
      "does not exist",
    );
  });

  it("rejects a time that is not 24-hour HH:MM", () => {
    expect(problemsOf(event({ start_time: "8:00" }))).toContain("start_time");
  });

  it("rejects an unknown event type", () => {
    expect(problemsOf(event({ type: "soundcheck" }))).toContain("type");
  });

  it("rejects an end time before the start time", () => {
    expect(
      problemsOf(event({ start_time: "20:00", end_time: "19:00" })),
    ).toContain("end_time");
  });

  it("rejects an end time equal to the start time", () => {
    expect(
      problemsOf(event({ start_time: "20:00", end_time: "20:00" })),
    ).toContain("end_time");
  });

  it("accepts an overnight event", () => {
    const result = expectOk(
      parseExtraction({
        events: [
          event({ start_time: "23:00", end_time: "01:00", ends_next_day: true }),
        ],
      }),
    );
    expect(result.events).toHaveLength(1);
  });

  it("rejects ends_next_day without an end time", () => {
    expect(
      problemsOf(event({ end_time: null, ends_next_day: true })),
    ).toContain("ends_next_day");
  });

  it("rejects a blank source snippet", () => {
    expect(problemsOf(event({ source_snippet: "   " }))).toContain(
      "source_snippet",
    );
  });

  it("rejects text over the length limit", () => {
    expect(
      problemsOf(event({ venue: "x".repeat(MAX_VENUE_CHARS + 1) })),
    ).toContain("venue");
  });

  it("accepts text of exactly the maximum length", () => {
    const result = expectOk(
      parseExtraction({
        events: [event({ notes: "x".repeat(MAX_NOTES_CHARS) })],
      }),
    );
    expect(result.events).toHaveLength(1);
  });

  it("rejects a missing required field", () => {
    expect(problemsOf(event({ ends_next_day: undefined }))).toContain(
      "ends_next_day",
    );
  });

  it("ignores unknown fields", () => {
    const result = expectOk(
      parseExtraction({ events: [event({ confidence: 0.9 })] }),
    );
    expect(result.events[0]).not.toHaveProperty("confidence");
  });

  it("rejects a blank title", () => {
    expect(problemsOf(event({ title: "   " }))).toContain("title");
  });

  it("rejects a title over the length limit", () => {
    expect(
      problemsOf(event({ title: "x".repeat(MAX_TITLE_CHARS + 1) })),
    ).toContain("title");
  });
});

describe("normalisation", () => {
  it("trims text and turns blank optional text into null", () => {
    const result = expectOk(
      parseExtraction({
        events: [
          event({
            venue: "  Theatre  ",
            department: "",
            notes: "   ",
            source_snippet: "  Sat 14 Nov 20:00 Show  ",
          }),
        ],
      }),
    );

    expect(result.events[0]).toMatchObject({
      venue: "Theatre",
      department: null,
      notes: null,
      source_snippet: "Sat 14 Nov 20:00 Show",
    });
  });
});

describe("parseExtraction envelope", () => {
  it("keeps good events and reports bad ones with their index", () => {
    const result = expectOk(
      parseExtraction({
        events: [event(), event({ type: "nope" }), event({ venue: "Atrium" })],
      }),
    );

    expect(result.events).toHaveLength(2);
    expect(result.rejected.map((r) => r.index)).toEqual([1]);
  });

  it("accepts an empty events list", () => {
    const result = expectOk(parseExtraction({ events: [] }));
    expect(result.events).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects responses with the wrong shape", () => {
    expect(parseExtraction({ items: [] }).ok).toBe(false);
    expect(parseExtraction([]).ok).toBe(false);
    expect(parseExtraction(null).ok).toBe(false);
  });
});

describe("parseExtractionJson", () => {
  it("parses valid JSON text", () => {
    const result = expectOk(
      parseExtractionJson(JSON.stringify({ events: [VALID] })),
    );
    expect(result.events).toHaveLength(1);
  });

  it("rejects text that is not JSON", () => {
    expect(parseExtractionJson("not json").ok).toBe(false);
  });
});
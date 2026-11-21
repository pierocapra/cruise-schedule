import { describe, expect, it } from "vitest";

import { extractionWindowStart, readDailyLimit } from "./extraction-limit";

describe("readDailyLimit", () => {
  it("uses the default when the variable is missing", () => {
    expect(readDailyLimit(undefined)).toBe(20);
  });

  it("accepts a positive whole number", () => {
    expect(readDailyLimit("5")).toBe(5);
  });

  it("falls back to the default for text", () => {
    expect(readDailyLimit("abc")).toBe(20);
  });

  it("falls back to the default for zero and negatives", () => {
    expect(readDailyLimit("0")).toBe(20);
    expect(readDailyLimit("-3")).toBe(20);
  });

  it("falls back to the default for fractions", () => {
    expect(readDailyLimit("2.5")).toBe(20);
  });
});

describe("extractionWindowStart", () => {
  it("is exactly 24 hours before the given time", () => {
    expect(extractionWindowStart(new Date("2026-11-21T12:00:00.000Z"))).toBe(
      "2026-11-20T12:00:00.000Z",
    );
  });
});
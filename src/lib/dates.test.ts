import { describe, expect, it } from "vitest";

import { inclusiveDayCount, isRealIsoDate } from "./dates";

describe("isRealIsoDate", () => {
  it("accepts real dates, including a leap day", () => {
    expect(isRealIsoDate("2026-11-15")).toBe(true);
    expect(isRealIsoDate("2028-02-29")).toBe(true);
  });

  it("rejects dates that do not exist", () => {
    expect(isRealIsoDate("2026-02-29")).toBe(false);
    expect(isRealIsoDate("2026-04-31")).toBe(false);
    expect(isRealIsoDate("2026-13-01")).toBe(false);
    expect(isRealIsoDate("2026-00-10")).toBe(false);
  });

  it("rejects years 0 to 99, which Date.UTC would silently shift to 19xx", () => {
    expect(isRealIsoDate("0050-01-01")).toBe(false);
  });

  it("rejects text that is not YYYY-MM-DD", () => {
    expect(isRealIsoDate("")).toBe(false);
    expect(isRealIsoDate("2026-1-5")).toBe(false);
    expect(isRealIsoDate("2026-11-15T00:00")).toBe(false);
    expect(isRealIsoDate("15/11/2026")).toBe(false);
  });
});

describe("inclusiveDayCount", () => {
  it("counts a single day as 1", () => {
    expect(inclusiveDayCount("2026-11-15", "2026-11-15")).toBe(1);
  });

  it("counts both ends", () => {
    expect(inclusiveDayCount("2026-11-07", "2026-11-13")).toBe(7);
    expect(inclusiveDayCount("2026-11-01", "2026-12-10")).toBe(40);
  });

  it("crosses month ends and leap days", () => {
    expect(inclusiveDayCount("2026-11-28", "2026-12-02")).toBe(5);
    expect(inclusiveDayCount("2028-02-28", "2028-03-01")).toBe(3);
  });

  it("is not thrown off by a daylight-saving change", () => {
    // UK clocks go back on 2026-10-25.
    expect(inclusiveDayCount("2026-10-24", "2026-10-26")).toBe(3);
  });

  it("returns 0 when the end is the day before the start", () => {
    expect(inclusiveDayCount("2026-11-10", "2026-11-09")).toBe(0);
  });

  it("throws on invalid dates instead of returning a wrong count", () => {
    expect(() => inclusiveDayCount("2026-02-30", "2026-03-05")).toThrow();
    expect(() => inclusiveDayCount("2026-03-01", "soon")).toThrow();
  });
});
import { describe, expect, it } from "vitest";

import { formatEventDate, formatTimes, hoursMinutes } from "./event-format";

describe("hoursMinutes", () => {
  it("drops the seconds Postgres adds", () => {
    expect(hoursMinutes("19:30:00")).toBe("19:30");
  });

  it("leaves HH:MM alone", () => {
    expect(hoursMinutes("19:30")).toBe("19:30");
  });
});

describe("formatTimes", () => {
  it("shows a range", () => {
    expect(formatTimes("19:30:00", "21:00:00", false)).toBe("19:30–21:00");
  });

  it("marks an event that ends the next day", () => {
    expect(formatTimes("23:00:00", "01:00:00", true)).toBe(
      "23:00–01:00 (+1 day)",
    );
  });

  it("shows only a start time", () => {
    expect(formatTimes("19:30:00", null, false)).toBe("19:30");
  });

  it("shows only an end time", () => {
    expect(formatTimes(null, "21:00:00", false)).toBe("until 21:00");
  });

  it("says so when there is no time at all", () => {
    expect(formatTimes(null, null, false)).toBe("No time");
  });
});

describe("formatEventDate", () => {
  it("prints the calendar day it was given", () => {
    const text = formatEventDate("2026-02-14");

    expect(text).toContain("Sat");
    expect(text).toContain("14 Feb 2026");
  });
});
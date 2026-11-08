import { describe, expect, it } from "vitest";
import { itemsToLines, type PdfTextItem } from "./pdf-layout";

// 6 points per character at a 12pt font: a realistic proportion.
function item(
  str: string,
  x: number,
  y: number,
  width = str.length * 6,
  height = 12,
): PdfTextItem {
  return { str, x, y, width, height };
}

describe("itemsToLines", () => {
  it("joins far-apart items on one row with ' | '", () => {
    const lines = itemsToLines([
      item("Time", 50, 780),
      item("Event", 200, 780),
      item("Venue", 350, 780),
    ]);
    expect(lines).toEqual(["Time | Event | Venue"]);
  });

  it("keeps words that are close together inside one cell", () => {
    const lines = itemsToLines([
      item("19:30", 50, 760),
      item("Welcome", 200, 760), // ends at x = 242
      item("Show", 248, 760), // 6pt gap = half an em: a space, not a column
      item("Theatre", 350, 760),
    ]);
    expect(lines).toEqual(["19:30 | Welcome Show | Theatre"]);
  });

  it("orders rows from the top of the page down, whatever the input order", () => {
    const lines = itemsToLines([
      item("second", 50, 700),
      item("first", 50, 780),
    ]);
    expect(lines).toEqual(["first", "second"]);
  });

  it("orders cells left to right, whatever the input order", () => {
    const lines = itemsToLines([
      item("Venue", 350, 780),
      item("Time", 50, 780),
    ]);
    expect(lines).toEqual(["Time | Venue"]);
  });

  it("treats slightly different baselines as the same row", () => {
    const lines = itemsToLines([
      item("Time", 50, 780),
      item("Event", 200, 779.4),
    ]);
    expect(lines).toEqual(["Time | Event"]);
  });

  it("ignores whitespace-only items", () => {
    const lines = itemsToLines([item("   ", 100, 780), item("Show", 50, 780)]);
    expect(lines).toEqual(["Show"]);
  });

  it("returns no lines when there are no items", () => {
    expect(itemsToLines([])).toEqual([]);
  });
});
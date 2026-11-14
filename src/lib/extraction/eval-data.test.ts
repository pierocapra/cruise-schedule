import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseExtractionJson } from "./event-schema";

const SAMPLES_DIR = path.join(process.cwd(), "eval", "samples");
const EXPECTED_DIR = path.join(process.cwd(), "eval", "expected");

function stemsIn(dir: string, extension: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(extension))
    .map((file) => file.slice(0, -extension.length))
    .sort();
}

function readText(file: string): string {
  // Git on Windows may check files out with CRLF line endings.
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

const SAMPLE_STEMS = stemsIn(SAMPLES_DIR, ".txt");
const EXPECTED_STEMS = stemsIn(EXPECTED_DIR, ".json");

// Only stems present on both sides are exercised below, so a missing
// partner is reported by the pairing test instead of crashing collection.
const PAIRED_STEMS = SAMPLE_STEMS.filter((stem) => EXPECTED_STEMS.includes(stem));

describe("evaluation data", () => {
  it("has an expected file for every sample and no orphans", () => {
    expect(EXPECTED_STEMS).toEqual(SAMPLE_STEMS);
  });
});

describe.each(PAIRED_STEMS)("eval sample %s", (stem) => {
  const sample = readText(path.join(SAMPLES_DIR, `${stem}.txt`));
  const expectedJson = readText(path.join(EXPECTED_DIR, `${stem}.json`));

  it("expected events pass the schema with nothing rejected", () => {
    const result = parseExtractionJson(expectedJson);
    if (!result.ok) throw new Error(result.message);

    expect(result.rejected).toEqual([]);
  });

  it("every source_snippet appears verbatim in the sample", () => {
    const result = parseExtractionJson(expectedJson);
    if (!result.ok) throw new Error(result.message);

    for (const event of result.events) {
      expect(
        sample.includes(event.source_snippet),
        `Snippet not found in sample: ${event.source_snippet}`,
      ).toBe(true);
    }
  });
});
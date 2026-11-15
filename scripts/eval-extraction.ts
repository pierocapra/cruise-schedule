import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  type ExtractedEvent,
  type ExtractionParseResult,
} from "../src/lib/extraction/event-schema";
import { extractEvents } from "../src/lib/extraction/extract-events";
import { createGeminiClientFromEnv } from "../src/lib/extraction/gemini-client";

const SAMPLES_DIR = join(__dirname, "..", "eval", "samples");
const EXPECTED_DIR = join(__dirname, "..", "eval", "expected");

const DEPARTMENT_NAMES = ["Production Theatre", "Production Cast", "Theatre"];

type ExpectedFile = { events: ExtractedEvent[] };
type ParsedOk = Extract<ExtractionParseResult, { ok: true }>;

function matchKey(event: Pick<ExtractedEvent, "event_date" | "start_time" | "title">): string {
  return [
    event.event_date,
    event.start_time ?? "",
    event.title.trim().toLowerCase().replace(/\s+/g, " "),
  ].join("|");
}

function fieldDiffs(expected: ExtractedEvent, actual: ExtractedEvent): string[] {
  const diffs: string[] = [];
  const fields: (keyof ExtractedEvent)[] = [
    "venue",
    "type",
    "end_time",
    "ends_next_day",
    "department",
  ];
  for (const field of fields) {
    if (expected[field] !== actual[field]) {
      diffs.push(
        `${field}: expected ${JSON.stringify(expected[field])}, got ${JSON.stringify(actual[field])}`,
      );
    }
  }
  return diffs;
}

type SampleTally = { truePositives: number; falsePositives: number; falseNegatives: number };

async function evalSample(
  client: ReturnType<typeof createGeminiClientFromEnv>,
  sampleName: string,
): Promise<SampleTally> {
  const rawText = readFileSync(join(SAMPLES_DIR, sampleName), "utf-8");
  const expectedName = sampleName.replace(/\.txt$/, ".json");
  const expected: ExpectedFile = JSON.parse(
    readFileSync(join(EXPECTED_DIR, expectedName), "utf-8"),
  );

  const result = await extractEvents({
    rawText,
    departmentNames: DEPARTMENT_NAMES,
    client,
  });

  console.log(`\n${sampleName}`);

  if (!result.ok) {
    console.log(`  EXTRACTION FAILED: ${result.message}`);
    return { truePositives: 0, falsePositives: 0, falseNegatives: expected.events.length };
  }

  const parsed: ParsedOk = result;

  const expectedByKey = new Map(expected.events.map((e) => [matchKey(e), e]));
  const actualByKey = new Map(parsed.events.map((e) => [matchKey(e), e]));

  let truePositives = 0;
  const fieldErrors: string[] = [];

  for (const [key, expectedEvent] of expectedByKey) {
    const actualEvent = actualByKey.get(key);
    if (actualEvent) {
      truePositives += 1;
      const diffs = fieldDiffs(expectedEvent, actualEvent);
      if (diffs.length > 0) {
        fieldErrors.push(
          `  "${expectedEvent.title}" (${expectedEvent.event_date} ${expectedEvent.start_time ?? "?"}):`,
        );
        for (const diff of diffs) fieldErrors.push(`    ${diff}`);
      }
    }
  }

  const falsePositives = parsed.events.length - truePositives;
  const falseNegatives = expected.events.length - truePositives;
  const precision = parsed.events.length > 0 ? truePositives / parsed.events.length : 1;
  const recall = expected.events.length > 0 ? truePositives / expected.events.length : 1;

  console.log(
    `  expected: ${expected.events.length}, extracted: ${parsed.events.length}, rejected: ${parsed.rejected.length}`,
  );
  console.log(
    `  precision: ${precision.toFixed(2)}, recall: ${recall.toFixed(2)} (TP ${truePositives}, FP ${falsePositives}, FN ${falseNegatives})`,
  );
  if (fieldErrors.length > 0) {
    console.log("  field mismatches on matched events:");
    console.log(fieldErrors.join("\n"));
  }
  if (parsed.rejected.length > 0) {
    console.log("  rejected:", parsed.rejected);
  }

  return { truePositives, falsePositives, falseNegatives };
}

async function main() {
  const client = createGeminiClientFromEnv();
  const sampleFiles = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".txt"));

  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  for (const sampleName of sampleFiles) {
    const { truePositives, falsePositives, falseNegatives } = await evalSample(
      client,
      sampleName,
    );
    totalTP += truePositives;
    totalFP += falsePositives;
    totalFN += falseNegatives;
  }

  const overallPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 1;
  const overallRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 1;

  console.log(`\nOVERALL precision: ${overallPrecision.toFixed(2)}, recall: ${overallRecall.toFixed(2)}`);
}

main().catch((error) => {
  console.error("EVAL FAILED:", error);
  process.exit(1);
});
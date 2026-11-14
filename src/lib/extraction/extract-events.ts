import { EVENTS_JSON_SCHEMA } from "./event-json-schema";
import {
  type ExtractedEvent,
  type ExtractionParseResult,
  type RejectedEvent,
  parseExtractionJson,
} from "./event-schema";
import type { ModelClient } from "./model-client";
import { buildExtractionPrompt } from "./prompt";

export type ExtractEventsInput = {
  rawText: string;
  departmentNames: string[];
  client: ModelClient;
};

type ParsedOk = Extract<ExtractionParseResult, { ok: true }>;

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * True when the snippet occurs in the source text, ignoring differences in
 * whitespace only. Case and wording must match exactly.
 */
export function snippetAppearsInSource(snippet: string, source: string): boolean {
  const needle = collapseWhitespace(snippet);
  return needle !== "" && collapseWhitespace(source).includes(needle);
}

// Moves events whose snippet is not in the source from `events` to `rejected`.
// Original positions are recovered so problems point at the model's own order.
function verifySnippets(parsed: ParsedOk, rawText: string): ExtractionParseResult {
  const schemaRejectedIndexes = new Set(parsed.rejected.map((r) => r.index));
  const total = parsed.events.length + parsed.rejected.length;

  const events: ExtractedEvent[] = [];
  const rejected: RejectedEvent[] = [...parsed.rejected];
  let nextAccepted = 0;

  for (let index = 0; index < total; index++) {
    if (schemaRejectedIndexes.has(index)) continue;

    const event = parsed.events[nextAccepted];
    nextAccepted++;
    if (!event) continue;

    if (snippetAppearsInSource(event.source_snippet, rawText)) {
      events.push(event);
    } else {
      rejected.push({
        index,
        raw: event,
        problems: [
          "source_snippet: this text does not appear in the schedule, so the event may have been invented",
        ],
      });
    }
  }

  rejected.sort((a, b) => a.index - b.index);

  return { ok: true, events, rejected };
}

export async function extractEvents(
  input: ExtractEventsInput,
): Promise<ExtractionParseResult> {
  const prompt = buildExtractionPrompt({
    rawText: input.rawText,
    departmentNames: input.departmentNames,
  });

  let responseText: string;
  try {
    responseText = await input.client.generateJson({
      system: prompt.system,
      user: prompt.user,
      jsonSchema: EVENTS_JSON_SCHEMA,
    });
  } catch (error) {
    console.error("extractEvents: model call failed", error);
    return {
      ok: false,
      message: "The AI service could not be reached. Please try again.",
    };
  }

  const parsed = parseExtractionJson(responseText);
  if (!parsed.ok) return parsed;

  return verifySnippets(parsed, input.rawText);
}
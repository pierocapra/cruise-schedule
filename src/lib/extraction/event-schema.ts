import { z } from "zod";

// Keep in sync with extracted_events_type_check in the database.
export const EVENT_TYPES = ["show", "rehearsal", "tech_call", "other"] as const;

// Keep in sync with the length checks on extracted_events in the database.
export const MAX_VENUE_CHARS = 200;
export const MAX_DEPARTMENT_CHARS = 200;
export const MAX_NOTES_CHARS = 1000;
export const MAX_SNIPPET_CHARS = 2000;
export const MAX_TITLE_CHARS = 200;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The fields of one event, as the AI must return them. Deliberately plain
 * (formats, enums, length limits only) so it can later be converted into a
 * JSON Schema for the model. Cross-field rules live in eventSchema below.
 */
export const eventFieldsSchema = z.object({
  event_date: z.string().regex(DATE_PATTERN, "Use the format YYYY-MM-DD"),
  start_time: z.string().regex(TIME_PATTERN, "Use 24-hour HH:MM").nullable(),
  end_time: z.string().regex(TIME_PATTERN, "Use 24-hour HH:MM").nullable(),
  ends_next_day: z.boolean(),
  venue: z.string().max(MAX_VENUE_CHARS).nullable(),
  type: z.enum(EVENT_TYPES),
  title: z.string().max(MAX_TITLE_CHARS),
  department: z.string().max(MAX_DEPARTMENT_CHARS).nullable(),
  notes: z.string().max(MAX_NOTES_CHARS).nullable(),
  source_snippet: z.string().max(MAX_SNIPPET_CHARS),
});

// A field that already failed its format check is reported once, there.
// These helpers return "fine" for malformed input so the same mistake is
// not reported twice by a cross-field rule.
function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return true;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function endsAfterStart(start: string | null, end: string | null): boolean {
  if (start === null || end === null) return true;
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return true;
  return end > start; // zero-padded HH:MM compares correctly as text
}

export const eventSchema = eventFieldsSchema
  .refine((e) => isRealDate(e.event_date), {
    message: "That date does not exist",
    path: ["event_date"],
  })
  .refine((e) => e.ends_next_day || endsAfterStart(e.start_time, e.end_time), {
    message:
      "The end time must be after the start time (or mark the event as ending the next day)",
    path: ["end_time"],
  })
  .refine((e) => !e.ends_next_day || e.end_time !== null, {
    message: "Marked as ending the next day, but there is no end time",
    path: ["ends_next_day"],
  })
  .refine((e) => e.source_snippet.trim().length > 0, {
    message: "The source snippet is required",
    path: ["source_snippet"],
  })
  .refine((e) => e.title.trim().length > 0, {
    message: "The title is required",
    path: ["title"],
  });

export type ExtractedEvent = z.infer<typeof eventSchema>;

function blankToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Trims text and turns blank optional text into null (models often send ""). */
export function normalizeEvent(event: ExtractedEvent): ExtractedEvent {
  return {
    ...event,
    venue: blankToNull(event.venue),
    department: blankToNull(event.department),
    notes: blankToNull(event.notes),
    source_snippet: event.source_snippet.trim(),
    title: event.title.trim(),
  };
}

const envelopeSchema = z.object({ events: z.array(z.unknown()) });

export type RejectedEvent = {
  index: number;
  raw: unknown;
  problems: string[];
};

export type ExtractionParseResult =
  | { ok: true; events: ExtractedEvent[]; rejected: RejectedEvent[] }
  | { ok: false; message: string };

function formatIssue(issue: { path: PropertyKey[]; message: string }): string {
  const field = issue.path.map(String).join(".");
  return field === "" ? issue.message : `${field}: ${issue.message}`;
}

/**
 * Validates the model's response. A malformed envelope fails the whole
 * response; a malformed event only rejects that event.
 */
export function parseExtraction(input: unknown): ExtractionParseResult {
  const envelope = envelopeSchema.safeParse(input);

  if (!envelope.success) {
    return {
      ok: false,
      message:
        'The AI response did not have the expected shape: an object with an "events" array.',
    };
  }

  const events: ExtractedEvent[] = [];
  const rejected: RejectedEvent[] = [];

  envelope.data.events.forEach((raw, index) => {
    const result = eventSchema.safeParse(raw);

    if (result.success) {
      events.push(normalizeEvent(result.data));
    } else {
      rejected.push({
        index,
        raw,
        problems: result.error.issues.map(formatIssue),
      });
    }
  });

  return { ok: true, events, rejected };
}

export function parseExtractionJson(text: string): ExtractionParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "The AI response was not valid JSON." };
  }

  return parseExtraction(parsed);
}
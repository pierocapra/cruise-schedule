import {
  eventSchema,
  normalizeEvent,
  type ExtractedEvent,
} from "./event-schema";

/** The fields a person may change in review. */
export type EventEdits = {
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean;
  venue: string | null;
  type: string;
  title: string;
  notes: string | null;
};

/** Fields an edit never changes: the evidence and the matched department. */
export type EventFixedFields = {
  department: string | null;
  source_snippet: string;
};

export type EventUpdateFields = Pick<
  ExtractedEvent,
  | "event_date"
  | "start_time"
  | "end_time"
  | "ends_next_day"
  | "venue"
  | "type"
  | "title"
  | "notes"
>;

export type PrepareEventUpdateResult =
  | { ok: true; fields: EventUpdateFields }
  | { ok: false; message: string };

const FIELD_LABELS: Record<string, string> = {
  event_date: "Date",
  start_time: "Start time",
  end_time: "End time",
  ends_next_day: "Ends next day",
  venue: "Venue",
  type: "Type",
  title: "Title",
  notes: "Notes",
  source_snippet: "Source snippet",
};

/**
 * Validates a person's edits against the same rules the AI output passes.
 * `edits` is untrusted (it arrives from the browser), hence `unknown`.
 * department and source_snippet always come from the stored row.
 */
export function prepareEventUpdate(
  edits: unknown,
  existing: EventFixedFields,
): PrepareEventUpdateResult {
  if (typeof edits !== "object" || edits === null) {
    return { ok: false, message: "Invalid event data." };
  }

  const parsed = eventSchema.safeParse({
    ...(edits as Record<string, unknown>),
    // Spread last so nothing the client sent can override these two.
    department: existing.department,
    source_snippet: existing.source_snippet,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const label = FIELD_LABELS[String(issue.path[0] ?? "")];
    return {
      ok: false,
      message: label ? `${label}: ${issue.message}` : issue.message,
    };
  }

  const event = normalizeEvent(parsed.data);

  return {
    ok: true,
    fields: {
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      ends_next_day: event.ends_next_day,
      venue: event.venue,
      type: event.type,
      title: event.title,
      notes: event.notes,
    },
  };
}
import { EVENT_TYPES } from "./event-schema";

type EventType = (typeof EVENT_TYPES)[number];

// Record<EventType, string> makes TypeScript fail the build if a type is
// ever added to EVENT_TYPES without a label here.
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  show: "Show",
  rehearsal: "Rehearsal",
  tech_call: "Tech call",
  other: "Other",
};

/** The database column is plain text, so fall back to the raw value. */
export function labelForEventType(type: string): string {
  return type in EVENT_TYPE_LABELS
    ? EVENT_TYPE_LABELS[type as EventType]
    : type;
}
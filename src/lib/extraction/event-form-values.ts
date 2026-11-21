import type { EventEdits } from "./event-edits";
import { hoursMinutes } from "./event-format";
import { EVENT_TYPES } from "./event-schema";

// Everything an <input> holds is a string (or a boolean for the checkbox),
// so form state is all strings; toEdits converts it back to the real shape.
export type FormValues = {
  event_date: string;
  start_time: string;
  end_time: string;
  ends_next_day: boolean;
  venue: string;
  type: string;
  title: string;
  notes: string;
};

export function emptyFormValues(defaultDate: string): FormValues {
  return {
    event_date: defaultDate,
    start_time: "",
    end_time: "",
    ends_next_day: false,
    venue: "",
    type: EVENT_TYPES[0],
    title: "",
    notes: "",
  };
}

export function toFormValues(event: EventEdits): FormValues {
  return {
    event_date: event.event_date,
    // <input type="time"> wants "19:30", not Postgres's "19:30:00".
    start_time: event.start_time ? hoursMinutes(event.start_time) : "",
    end_time: event.end_time ? hoursMinutes(event.end_time) : "",
    ends_next_day: event.ends_next_day,
    venue: event.venue ?? "",
    type: event.type,
    title: event.title,
    notes: event.notes ?? "",
  };
}

export function toEdits(values: FormValues): EventEdits {
  return {
    event_date: values.event_date,
    // An empty time input is "", but the schema wants null for "no time".
    start_time: values.start_time === "" ? null : values.start_time,
    end_time: values.end_time === "" ? null : values.end_time,
    ends_next_day: values.ends_next_day,
    venue: values.venue.trim() === "" ? null : values.venue,
    type: values.type,
    title: values.title,
    notes: values.notes.trim() === "" ? null : values.notes,
  };
}
"use client";

import { Fragment, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { prepareEventUpdate } from "@/lib/extraction/event-edits";
import {
  toEdits,
  toFormValues,
  type FormValues,
} from "@/lib/extraction/event-form-values";
import { formatEventDate, formatTimes } from "@/lib/extraction/event-format";
import { labelForEventType } from "@/lib/extraction/event-labels";

import { updateEvent } from "./actions";
import { DeleteEventButton } from "./delete-event-button";
import { EventFormFields } from "./event-form-fields";
import { ReviewedToggle } from "./reviewed-toggle";
import type { EventWarning } from "@/lib/extraction/event-warnings";

export type ReviewEvent = {
  id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean;
  venue: string | null;
  type: string;
  title: string;
  notes: string | null;
  source_snippet: string;
  reviewed: boolean;
};

type EventRowProps = {
  event: ReviewEvent;
  fileName: string;
  cruiseId: string;
  warnings: EventWarning[];
};

export function EventRow({ event, fileName, cruiseId, warnings }: EventRowProps) {
  // null = not editing; an object = editing, holding the form's current values.
  const [values, setValues] = useState<FormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleEdit() {
    setError(null);
    setValues(toFormValues(event));
  }

  function handleCancel() {
    setError(null);
    setValues(null);
  }

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!values) return;
    setError(null);

    const edits = toEdits(values);

    // Instant feedback with the same rules the server applies. The
    // department is irrelevant to validating an edit, so null is fine here;
    // updateEvent re-validates with the stored value.
    const checked = prepareEventUpdate(edits, {
      department: null,
      source_snippet: event.source_snippet,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateEvent(event.id, cruiseId, edits);

        if (result.ok) {
          setValues(null);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("EventRow: update call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  if (values) {
    return (
      <TableRow className="hover:bg-transparent">
        {/* 8 = the number of columns in the review table's header. */}
        <TableCell colSpan={8} className="whitespace-normal">
          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <EventFormFields values={values} onChange={setField} />

            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{fileName}</span> ·{" "}
              {event.source_snippet}
            </p>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Fragment>
      <TableRow className="border-b-0">
        <TableCell>{formatEventDate(event.event_date)}</TableCell>
        <TableCell>
          {formatTimes(event.start_time, event.end_time, event.ends_next_day)}
        </TableCell>
        <TableCell className="font-medium whitespace-normal">
          {event.title}
        </TableCell>
        <TableCell className="whitespace-normal">{event.venue ?? "—"}</TableCell>
        <TableCell>{labelForEventType(event.type)}</TableCell>
        <TableCell className="min-w-48 whitespace-normal">
          {event.notes ?? "—"}
        </TableCell>
        <TableCell>
          <ReviewedToggle
            eventId={event.id}
            cruiseId={cruiseId}
            reviewed={event.reviewed}
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleEdit}>
              Edit
            </Button>
            <DeleteEventButton eventId={event.id} cruiseId={cruiseId} />
          </div>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={8}
          className="pt-0 pb-3 text-xs whitespace-normal text-muted-foreground"
        >
          <span className="font-medium">{fileName}</span> · {event.source_snippet}
          {warnings.map((warning) => (
            <p key={warning.kind} className="mt-1 text-amber-700">
              ⚠ {warning.message}
            </p>
          ))}
        </TableCell>
      </TableRow>
    </Fragment>
  );
}
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { prepareEventUpdate } from "@/lib/extraction/event-edits";
import {
  emptyFormValues,
  toEdits,
  type FormValues,
} from "@/lib/extraction/event-form-values";
import { MANUAL_SNIPPET } from "@/lib/extraction/manual-source";

import { addManualEvent } from "./actions";
import { EventFormFields } from "./event-form-fields";

type AddEventFormProps = {
  cruiseId: string;
  // The form opens on this date (the cruise's first day).
  defaultDate: string;
};

export function AddEventForm({ cruiseId, defaultDate }: AddEventFormProps) {
  // null = collapsed; an object = open, holding the form's current values.
  const [values, setValues] = useState<FormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleOpen() {
    setError(null);
    setValues(emptyFormValues(defaultDate));
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

    // Instant feedback with the same rules addManualEvent applies.
    const checked = prepareEventUpdate(edits, {
      department: null,
      source_snippet: MANUAL_SNIPPET,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await addManualEvent(cruiseId, edits);

        if (result.ok) {
          setValues(null);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("AddEventForm: add call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  if (!values) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        Add event
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border p-3"
    >
      <div>
        <h2 className="text-sm font-medium">Add event</h2>
        <p className="text-xs text-muted-foreground">
          Events you add are marked as reviewed.
        </p>
      </div>

      <EventFormFields values={values} onChange={setField} />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add event"}
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
  );
}
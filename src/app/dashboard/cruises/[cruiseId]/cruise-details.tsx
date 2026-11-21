"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  toCruiseFormValues,
  toCruiseInput,
  type CruiseFormValues,
} from "@/lib/cruises/cruise-form-values";
import { cruiseSchema } from "@/lib/cruises/cruise-schema";

import { updateCruise } from "../actions";
import { CruiseFormFields } from "../cruise-form-fields";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type CruiseDetailsProps = {
  cruise: {
    id: string;
    ship: string | null;
    start_date: string;
    end_date: string;
    itinerary_notes: string | null;
  };
};

export function CruiseDetails({ cruise }: CruiseDetailsProps) {
  // null = not editing; an object = editing, holding the form's current values.
  const [values, setValues] = useState<CruiseFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof CruiseFormValues, value: string) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleEdit() {
    setError(null);
    setValues(toCruiseFormValues(cruise));
  }

  function handleCancel() {
    setError(null);
    setValues(null);
  }

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!values) return;
    setError(null);

    const input = toCruiseInput(values);

    // Instant feedback; updateCruise re-validates server-side.
    const parsed = cruiseSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateCruise(cruise.id, input);

        if (result.ok) {
          setValues(null);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("CruiseDetails: update call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  if (values) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-sm font-medium">Edit cruise</h2>

        <CruiseFormFields values={values} onChange={setField} />

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
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{cruise.ship ?? "No ship set"}</h1>
        <p className="text-sm text-muted-foreground">
          {dateFormat.format(new Date(`${cruise.start_date}T00:00:00Z`))} –{" "}
          {dateFormat.format(new Date(`${cruise.end_date}T00:00:00Z`))}
        </p>
        {cruise.itinerary_notes && (
          <p className="text-sm text-muted-foreground">{cruise.itinerary_notes}</p>
        )}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleEdit}>
        Edit
      </Button>
    </div>
  );
}
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cruiseSchema } from "@/lib/cruises/cruise-schema";
import { MAX_ITINERARY_NOTES_CHARS, MAX_SHIP_CHARS } from "@/lib/cruises/cruise-form-constants";

import { createCruise } from "./actions";

const initialState = {
  ship: "",
  start_date: "",
  end_date: "",
  itinerary_notes: "",
};

export function CreateCruiseForm() {
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = {
      ship: values.ship,
      start_date: values.start_date,
      end_date: values.end_date,
      itinerary_notes: values.itinerary_notes.trim() === "" ? null : values.itinerary_notes,
    };

    // Client-side check for instant feedback; createCruise re-validates the
    // same schema server-side, since this call can be bypassed.
    const parsed = cruiseSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createCruise(input);

        if (result.ok) {
          setValues(initialState);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("CreateCruiseForm: action call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-medium">New cruise</h2>

      <input
        type="text"
        value={values.ship}
        onChange={(event) => setValues((v) => ({ ...v, ship: event.target.value }))}
        maxLength={MAX_SHIP_CHARS}
        placeholder="Ship name"
        aria-label="Ship name"
        className="block w-full rounded-md border px-3 py-2"
      />

      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          Start date
          <input
            type="date"
            value={values.start_date}
            onChange={(event) =>
              setValues((v) => ({ ...v, start_date: event.target.value }))
            }
            className="mt-1 block w-full rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex-1 text-sm">
          End date
          <input
            type="date"
            value={values.end_date}
            onChange={(event) =>
              setValues((v) => ({ ...v, end_date: event.target.value }))
            }
            className="mt-1 block w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>

      <textarea
        value={values.itinerary_notes}
        onChange={(event) =>
          setValues((v) => ({ ...v, itinerary_notes: event.target.value }))
        }
        maxLength={MAX_ITINERARY_NOTES_CHARS}
        rows={3}
        placeholder="Itinerary notes (optional)"
        aria-label="Itinerary notes"
        className="block w-full rounded-md border px-3 py-2 text-sm"
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create cruise"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
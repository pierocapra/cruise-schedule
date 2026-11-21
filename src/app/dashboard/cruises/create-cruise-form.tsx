"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  emptyCruiseFormValues,
  toCruiseInput,
  type CruiseFormValues,
} from "@/lib/cruises/cruise-form-values";
import { cruiseSchema } from "@/lib/cruises/cruise-schema";

import { createCruise } from "./actions";
import { CruiseFormFields } from "./cruise-form-fields";

export function CreateCruiseForm() {
  const [values, setValues] = useState<CruiseFormValues>(emptyCruiseFormValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof CruiseFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = toCruiseInput(values);

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
          setValues(emptyCruiseFormValues);
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

      <CruiseFormFields values={values} onChange={setField} />

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
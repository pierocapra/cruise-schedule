"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteEvent } from "./actions";

type DeleteEventButtonProps = {
  eventId: string;
  cruiseId: string;
};

export function DeleteEventButton({ eventId, cruiseId }: DeleteEventButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteEvent(eventId, cruiseId);

        if (!result.ok) {
          setError(result.message);
        }
        // On success the row disappears after revalidation, which
        // unmounts this component, so there is nothing to reset here.
      } catch (err) {
        console.error("DeleteEventButton: delete call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteFileEvents, getFileEventSummary } from "./actions";

type DeleteEventsButtonProps = {
  sourceFileId: string;
  cruiseId: string;
};

type ConfirmState = {
  total: number;
  reviewed: number;
};

export function DeleteEventsButton({ sourceFileId, cruiseId }: DeleteEventsButtonProps) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await getFileEventSummary(sourceFileId);

        if (result.ok) {
          setConfirm(result.summary);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("DeleteEventsButton: summary call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteFileEvents(sourceFileId, cruiseId);

        if (!result.ok) {
          setError(result.message);
          setConfirm(null);
        }
        // On success the events disappear after revalidation; the parent
        // list stops rendering this button once it re-fetches with no events.
      } catch (err) {
        console.error("DeleteEventsButton: delete call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
        setConfirm(null);
      }
    });
  }

  if (!confirm) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleStart}
          disabled={isPending}
        >
          {isPending ? "Checking…" : "Delete events"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Delete {confirm.total} extracted event{confirm.total === 1 ? "" : "s"}
        {confirm.reviewed > 0 && `, including ${confirm.reviewed} already reviewed,`} for
        this file? This cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? "Deleting…" : "Yes, delete events"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirm(null)}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
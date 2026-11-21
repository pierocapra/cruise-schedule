"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { archiveCruise, restoreCruise } from "./actions";

type ArchiveToggleButtonProps = {
  cruiseId: string;
  // true = the cruise is archived, so this button restores it.
  archived: boolean;
};

export function ArchiveToggleButton({ cruiseId, archived }: ArchiveToggleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);

    startTransition(async () => {
      try {
        const result = archived
          ? await restoreCruise(cruiseId)
          : await archiveCruise(cruiseId);

        if (!result.ok) {
          setError(result.message);
        }
        // On success the page revalidates and re-renders in its new state.
      } catch (err) {
        console.error("ArchiveToggleButton: call failed", err);
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
        {archived
          ? isPending
            ? "Restoring…"
            : "Restore"
          : isPending
            ? "Archiving…"
            : "Archive"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

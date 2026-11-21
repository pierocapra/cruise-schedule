"use client";

import { useOptimistic, useState, useTransition } from "react";

import { setEventReviewed } from "./actions";

type ReviewedToggleProps = {
  eventId: string;
  cruiseId: string;
  reviewed: boolean;
};

export function ReviewedToggle({ eventId, cruiseId, reviewed }: ReviewedToggleProps) {
  // Shows the new value immediately; React drops it back to the real prop
  // value once the transition ends (so a failed call un-ticks itself).
  const [shownReviewed, setShownReviewed] = useOptimistic(reviewed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const next = changeEvent.target.checked;
    setError(null);

    startTransition(async () => {
      setShownReviewed(next);

      try {
        const result = await setEventReviewed(eventId, cruiseId, next);

        if (!result.ok) {
          setError(result.message);
        }
      } catch (err) {
        console.error("ReviewedToggle: update call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <label
        className={`flex items-center gap-2 ${
          shownReviewed ? "text-green-700" : "text-muted-foreground"
        }`}
      >
        <input
          type="checkbox"
          checked={shownReviewed}
          onChange={handleChange}
          disabled={isPending}
        />
        {shownReviewed ? "Reviewed" : "Pending"}
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
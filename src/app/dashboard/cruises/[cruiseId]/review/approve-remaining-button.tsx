"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { approveRemainingEvents } from "./actions";

type ApproveRemainingButtonProps = {
  cruiseId: string;
  pendingCount: number;
  pendingWithWarnings: number;
};

export function ApproveRemainingButton({
  cruiseId,
  pendingCount,
  pendingWithWarnings,      
}: ApproveRemainingButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await approveRemainingEvents(cruiseId);

        if (result.ok) {
          setConfirming(false);
        } else {
          setError(result.message);
          setConfirming(false);
        }
      } catch (err) {
        console.error("ApproveRemainingButton: call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
        setConfirming(false);
      }
    });
  }

  // Nothing left to approve. (After every hook, so hook order never changes.)
  if (pendingCount === 0) {
    return null;
  }

  if (!confirming) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Approve all remaining ({pendingCount})
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
            Mark {pendingCount} pending event{pendingCount === 1 ? "" : "s"} as
            reviewed?
            {pendingWithWarnings > 0 &&
                ` ${pendingWithWarnings} of them ${pendingWithWarnings === 1 ? "has" : "have"} warnings.`}{" "}
            You can untick any of them afterwards.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? "Approving…" : "Yes, approve all"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteSourceFile } from "./actions";

type DeleteButtonProps = {
  sourceFileId: string;
  fileName: string;
};

export function DeleteButton({ sourceFileId, fileName }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteSourceFile(sourceFileId);

        if (!result.ok) {
          setError(result.message);
          setConfirming(false);
        }
        // On success the row disappears after revalidation and this
        // component unmounts, so there is nothing to reset.
      } catch (err) {
        console.error("DeleteButton: action call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Delete
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
        Delete <span className="font-medium">{fileName}</span>? This cannot be
        undone.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
        >
          {isPending ? "Deleting…" : "Yes, delete"}
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
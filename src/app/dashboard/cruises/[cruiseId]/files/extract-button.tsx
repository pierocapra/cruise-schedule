"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { extractSourceEvents, type ExtractSourceEventsResult } from "./actions";

type ExtractButtonProps = {
  sourceFileId: string;
  cruiseId: string;
};

export function ExtractButton({ sourceFileId, cruiseId }: ExtractButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ExtractSourceEventsResult | null>(null);

  function handleClick() {
    setResult(null);

    startTransition(async () => {
      try {
        setResult(await extractSourceEvents(sourceFileId, cruiseId));
      } catch (error) {
        console.error("ExtractButton: action call failed", error);
        setResult({
          ok: false,
          message: "Could not reach the server. Check your connection and try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Extracting…" : "Extract"}
      </Button>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      )}

      {result?.ok && (
        <p className="text-sm" role="status">
          Extracted {result.kept} event{result.kept === 1 ? "" : "s"}
          {result.rejected > 0 &&
            ` (${result.rejected} rejected — check the AI's response)`}
          .
        </p>
      )}
    </div>
  );
}
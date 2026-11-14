"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { parseSourceFile, type ParseSourceFileResult } from "./actions";

type ParseButtonProps = {
  sourceFileId: string;
  alreadyParsed: boolean;
};

export function ParseButton({ sourceFileId, alreadyParsed }: ParseButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ParseSourceFileResult | null>(null);

  function handleClick() {
    setResult(null);

    startTransition(async () => {
      try {
        setResult(await parseSourceFile(sourceFileId));
      } catch (error) {
        console.error("ParseButton: action call failed", error);
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
        {isPending ? "Parsing…" : alreadyParsed ? "Parse again" : "Parse"}
      </Button>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      )}

            {result?.ok && !result.needsOcr && (
        <p className="text-sm" role="status">
          Extracted {result.characters.toLocaleString()} characters.
        </p>
      )}
    </div>
  );
}
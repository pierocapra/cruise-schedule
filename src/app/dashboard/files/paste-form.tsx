"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  MAX_PASTED_CHARS,
  MAX_TITLE_CHARS,
} from "@/lib/ingest/prepare-pasted-text";

import { createTextSource } from "./actions";

// Same normalisation the server applies, so the counter matches it.
function countChars(value: string): number {
  return value.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim().length;
}

export function PasteForm() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const chars = countChars(text);
  const overLimit = chars > MAX_PASTED_CHARS;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        const result = await createTextSource({ title, text });

        if (result.ok) {
          setTitle("");
          setText("");
          setSaved(true);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("PasteForm: action call failed", err);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-medium">Or paste text</h2>

      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={MAX_TITLE_CHARS}
        placeholder="Title (optional), e.g. Week 12 entertainment schedule"
        aria-label="Title"
        className="block w-full rounded-md border px-3 py-2"
      />

      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
        rows={8}
        placeholder="Paste the schedule text here"
        aria-label="Schedule text"
        className="block w-full rounded-md border px-3 py-2 font-mono text-sm"
      />

      <div className="flex items-center justify-between gap-4">
        <p
          className={`text-xs ${overLimit ? "text-red-600" : "text-muted-foreground"}`}
        >
          {chars.toLocaleString("en-GB")} / {MAX_PASTED_CHARS.toLocaleString("en-GB")}{" "}
          characters
        </p>

        <Button type="submit" disabled={isPending || chars === 0 || overLimit}>
          {isPending ? "Saving…" : "Save text"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-green-700">
          Text saved.
        </p>
      )}
    </form>
  );
}
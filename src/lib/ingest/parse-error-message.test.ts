import { describe, expect, it } from "vitest";

import { describeParseError } from "./parse-error-message";
import { parseSource } from "./parse-source";

// Runs the call and hands back whatever it threw, so the tests use the
// real error classes instead of guessing their constructor signatures.
async function catchError(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the call to throw, but it did not.");
}

describe("describeParseError", () => {
  it("explains unsupported file types", async () => {
    const error = await catchError(async () =>
      parseSource(new Uint8Array([1, 2, 3]), "notes.docx"),
    );

    expect(describeParseError(error)).toContain("isn't supported");
  });

  it("returns the friendly message of a SourceParseError", async () => {
    // An empty text file is rejected by parseSource with a SourceParseError.
    const error = await catchError(async () =>
      parseSource(new Uint8Array(0), "empty.txt"),
    );

    expect(describeParseError(error)).toBe((error as Error).message);
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(describeParseError(new Error("db exploded"))).not.toContain(
      "db exploded",
    );
  });

  it("handles non-Error values", () => {
    expect(describeParseError("boom")).toContain("Something went wrong");
  });
});
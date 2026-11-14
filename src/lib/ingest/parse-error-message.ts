import { SourceParseError, UnsupportedFileTypeError } from "./parse-source";

/**
 * Turns anything thrown by parseSource into a message that is safe and
 * useful to show to the user. Never includes internal details.
 */
export function describeParseError(error: unknown): string {
  if (error instanceof UnsupportedFileTypeError) {
    return "This file type isn't supported. Upload a PDF, an Excel file (.xlsx or .xls), a CSV or a text file.";
  }

  if (error instanceof SourceParseError) {
    // The friendly message was written for this purpose in parse-source.ts.
    // The technical detail lives on error.cause and is logged separately.
    return error.message;
  }

  return "Something went wrong while reading this file. Please try again.";
}
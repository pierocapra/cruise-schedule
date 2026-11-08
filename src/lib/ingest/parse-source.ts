import { decodeText } from "./decode-text";
import { pdfToText } from "./pdf-to-text";
import { spreadsheetToText } from "./spreadsheet-to-text";

export type ParsedSource = {
  /** Plain text ready for the LLM; empty only when needsOcr is true. */
  text: string;
  /** Human-readable notes to show the user next to the file. */
  warnings: string[];
  /** True for a scanned PDF: there is no text layer to read yet. */
  needsOcr: boolean;
};

/** The file's extension is not one we can parse. */
export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string) {
    super(`Unsupported file type: ${fileName}`);
    this.name = "UnsupportedFileTypeError";
  }
}

/** The file is the right type but its content could not be read. */
export class SourceParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SourceParseError";
  }
}

/**
 * Turn an uploaded file into text, choosing the parser by extension.
 *
 * Throws UnsupportedFileTypeError or SourceParseError; never any
 * parser-specific error, so callers have two cases to handle.
 */
export async function parseSource(
  bytes: Uint8Array,
  fileName: string,
): Promise<ParsedSource> {
  try {
    const parsed = await parseByExtension(bytes, fileName);

    if (!parsed.needsOcr && parsed.text === "") {
      throw new SourceParseError("The file contains no readable text.");
    }
    return parsed;
  } catch (error) {
    if (
      error instanceof UnsupportedFileTypeError ||
      error instanceof SourceParseError
    ) {
      throw error;
    }
    throw new SourceParseError(
      "This file could not be read. It may be damaged or protected with a password.",
      { cause: error },
    );
  }
}

async function parseByExtension(
  bytes: Uint8Array,
  fileName: string,
): Promise<ParsedSource> {
  switch (getExtension(fileName)) {
    case "pdf":
      return parsePdf(bytes);
    case "xlsx":
    case "xls":
      return plain(spreadsheetToText(bytes));
    case "csv":
    case "txt":
      return plain(decodeText(bytes));
    default:
      throw new UnsupportedFileTypeError(fileName);
  }
}

function plain(text: string): ParsedSource {
  return { text, warnings: [], needsOcr: false };
}

async function parsePdf(bytes: Uint8Array): Promise<ParsedSource> {
  const result = await pdfToText(bytes);

  if (result.needsOcr) {
    return {
      text: "",
      warnings: ["This PDF looks scanned: it has no selectable text."],
      needsOcr: true,
    };
  }

  const warnings: string[] = [];
  if (result.emptyPages.length > 0) {
    const plural = result.emptyPages.length > 1 ? "pages" : "page";
    warnings.push(
      `No readable text on ${plural} ${result.emptyPages.join(", ")}.`,
    );
  }
  return { text: result.text, warnings, needsOcr: false };
}

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}
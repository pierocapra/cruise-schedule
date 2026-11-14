// Keep in sync with the check constraint
// source_files_pasted_text_max_length in the database.
export const MAX_PASTED_CHARS = 100_000;
export const MAX_TITLE_CHARS = 120;

export type PreparedPastedText =
  | { ok: true; title: string; text: string }
  | { ok: false; message: string };

function defaultTitle(now: Date): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  return `Pasted text ${stamp} UTC`;
}

/**
 * Validates and normalises text pasted by the user. Inputs are `unknown`
 * because they come from a server action argument, which is untrusted.
 * `now` is injectable so the default title is testable.
 */
export function preparePastedText(
  rawText: unknown,
  rawTitle: unknown,
  now: Date = new Date(),
): PreparedPastedText {
  if (typeof rawText !== "string") {
    return { ok: false, message: "Paste some text first." };
  }

  const text = rawText
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim();

  if (text === "") {
    return { ok: false, message: "Paste some text first." };
  }

  if (text.length > MAX_PASTED_CHARS) {
    return {
      ok: false,
      message: `That text is too long. The limit is ${MAX_PASTED_CHARS.toLocaleString("en-GB")} characters.`,
    };
  }

  const cleanedTitle =
    typeof rawTitle === "string" ? rawTitle.replace(/\s+/g, " ").trim() : "";

  if (cleanedTitle.length > MAX_TITLE_CHARS) {
    return {
      ok: false,
      message: `The title is too long. The limit is ${MAX_TITLE_CHARS} characters.`,
    };
  }

  return {
    ok: true,
    title: cleanedTitle === "" ? defaultTitle(now) : cleanedTitle,
    text,
  };
}
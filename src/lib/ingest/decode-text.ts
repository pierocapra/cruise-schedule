/**
 * Decode raw file bytes into a clean string.
 *
 * Handles: UTF-8 (with or without BOM), UTF-16 LE/BE with BOM,
 * and a Windows-1252 fallback (what Excel on Windows often writes
 * when you "Save as CSV").
 *
 * Output always uses "\n" line endings and contains no BOM.
 */
export function decodeText(bytes: Uint8Array): string {
  const raw = decodeWithBestEncoding(bytes);
  return normaliseText(raw);
}

function decodeWithBestEncoding(bytes: Uint8Array): string {
  // 1. Explicit BOMs tell us the encoding for certain.
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le").decode(bytes);
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be").decode(bytes);
    }
  }

  // 2. Try strict UTF-8. `fatal: true` makes the decoder throw on any
  //    invalid byte sequence instead of silently inserting U+FFFD.
  //    A UTF-8 BOM (EF BB BF) is stripped by default.
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // 3. Not valid UTF-8, so assume Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function normaliseText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n") // CRLF and lone CR -> LF
    .replace(/\u0000/g, "") // stray NULs break JSON and Postgres text columns
    .trim();
}
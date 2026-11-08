import { describe, expect, it } from "vitest";
import { decodeText } from "./decode-text";

describe("decodeText", () => {
  it("decodes plain UTF-8 including accents", () => {
    const bytes = new TextEncoder().encode("Café Théâtre 19:30");
    expect(decodeText(bytes)).toBe("Café Théâtre 19:30");
  });

  it("strips a UTF-8 BOM", () => {
    const body = new TextEncoder().encode("Show,19:30");
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...body]);
    expect(decodeText(bytes)).toBe("Show,19:30");
  });

  it("normalises CRLF and lone CR to LF", () => {
    const bytes = new TextEncoder().encode("a\r\nb\rc\nd");
    expect(decodeText(bytes)).toBe("a\nb\nc\nd");
  });

  it("falls back to Windows-1252 when the bytes are not valid UTF-8", () => {
    // "Café" in Windows-1252: the é is the single byte 0xE9
    const bytes = Uint8Array.from([0x43, 0x61, 0x66, 0xe9]);
    expect(decodeText(bytes)).toBe("Café");
  });

  it("decodes UTF-16 LE with a BOM", () => {
    const bytes = new Uint8Array(Buffer.from("\ufeffHi there", "utf16le"));
    expect(decodeText(bytes)).toBe("Hi there");
  });

  it("removes NUL characters and trims the result", () => {
    const bytes = new TextEncoder().encode("  a\u0000b  \n");
    expect(decodeText(bytes)).toBe("ab");
  });
});
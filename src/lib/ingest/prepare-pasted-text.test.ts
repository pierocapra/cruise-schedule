import { describe, expect, it } from "vitest";

import {
  MAX_PASTED_CHARS,
  MAX_TITLE_CHARS,
  preparePastedText,
} from "./prepare-pasted-text";

const NOW = new Date("2026-11-14T10:39:00Z");

describe("preparePastedText: text", () => {
  it("normalises CRLF and lone CR to LF", () => {
    expect(preparePastedText("a\r\nb\rc", "t", NOW)).toEqual({
      ok: true,
      title: "t",
      text: "a\nb\nc",
    });
  });

  it("strips NUL characters", () => {
    expect(preparePastedText("a\u0000b", "t", NOW)).toMatchObject({
      ok: true,
      text: "ab",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(preparePastedText("  \n hello \n ", "t", NOW)).toMatchObject({
      ok: true,
      text: "hello",
    });
  });

  it("rejects non-string text", () => {
    expect(preparePastedText(42, "t", NOW)).toMatchObject({ ok: false });
  });

  it("rejects whitespace-only text", () => {
    expect(preparePastedText(" \n\t ", "t", NOW)).toMatchObject({ ok: false });
  });

  it("accepts text of exactly the maximum length", () => {
    expect(
      preparePastedText("a".repeat(MAX_PASTED_CHARS), "t", NOW),
    ).toMatchObject({ ok: true });
  });

  it("rejects text over the maximum length", () => {
    expect(
      preparePastedText("a".repeat(MAX_PASTED_CHARS + 1), "t", NOW),
    ).toMatchObject({ ok: false });
  });
});

describe("preparePastedText: title", () => {
  it("builds a default title from the supplied clock", () => {
    expect(preparePastedText("x", undefined, NOW)).toMatchObject({
      ok: true,
      title: "Pasted text 2026-11-14 10:39 UTC",
    });
  });

  it("uses the default title when the title is blank", () => {
    expect(preparePastedText("x", "   ", NOW)).toMatchObject({
      ok: true,
      title: "Pasted text 2026-11-14 10:39 UTC",
    });
  });

  it("uses the default title when the title is not a string", () => {
    expect(preparePastedText("x", 42, NOW)).toMatchObject({
      ok: true,
      title: "Pasted text 2026-11-14 10:39 UTC",
    });
  });

  it("collapses whitespace inside a provided title", () => {
    expect(preparePastedText("x", "  Week   12\tschedule ", NOW)).toMatchObject({
      ok: true,
      title: "Week 12 schedule",
    });
  });

  it("rejects a title over the maximum length", () => {
    expect(
      preparePastedText("x", "x".repeat(MAX_TITLE_CHARS + 1), NOW),
    ).toMatchObject({ ok: false });
  });
});
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  parseSource,
  SourceParseError,
  UnsupportedFileTypeError,
} from "./parse-source";

const encode = (text: string) => new TextEncoder().encode(text);

/** Each inner array is the lines of one page; [] gives a page with no text. */
async function makePdf(pages: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([595, 842]);
    lines.forEach((line, i) => {
      page.drawText(line, { x: 50, y: 780 - i * 20, size: 12, font });
    });
  }
  return doc.save();
}

function makeXlsx(rows: string[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "S");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}

const LONG_LINE = "Production show in the theatre at 19:30 tonight";

describe("parseSource", () => {
  it("parses a text file", async () => {
    const result = await parseSource(
      encode("Show 19:30\r\nRehearsal 14:00"),
      "week.txt",
    );
    expect(result).toEqual({
      text: "Show 19:30\nRehearsal 14:00",
      warnings: [],
      needsOcr: false,
    });
  });

  it("decodes a Windows-1252 CSV, whatever the case of the extension", async () => {
    const bytes = Uint8Array.from([0x43, 0x61, 0x66, 0xe9]); // "Café"
    const result = await parseSource(bytes, "MENU.CSV");
    expect(result.text).toBe("Café");
  });

  it("parses an xlsx workbook", async () => {
    const result = await parseSource(makeXlsx([["Show", "19:30"]]), "week.xlsx");
    expect(result.text).toBe("## Sheet: S\nShow | 19:30");
    expect(result.needsOcr).toBe(false);
  });

  it("parses a PDF with text", async () => {
    const result = await parseSource(await makePdf([[LONG_LINE]]), "week.pdf");
    expect(result.text).toContain("## Page 1");
    expect(result.text).toContain(LONG_LINE);
    expect(result.needsOcr).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("reports a scanned PDF as needing OCR instead of failing", async () => {
    const result = await parseSource(await makePdf([[], []]), "scan.pdf");
    expect(result.text).toBe("");
    expect(result.needsOcr).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it("warns about an empty page inside a PDF that has text", async () => {
    const result = await parseSource(
      await makePdf([[LONG_LINE], []]),
      "week.pdf",
    );
    expect(result.needsOcr).toBe(false);
    expect(result.warnings[0]).toContain("page 2");
  });

  it("rejects an unsupported extension", async () => {
    await expect(parseSource(encode("x"), "photo.png")).rejects.toBeInstanceOf(
      UnsupportedFileTypeError,
    );
  });

  it("wraps parser failures in SourceParseError", async () => {
    await expect(
      parseSource(encode("this is not a pdf"), "broken.pdf"),
    ).rejects.toBeInstanceOf(SourceParseError);
  });

  it("rejects a file with no readable text", async () => {
    await expect(
      parseSource(encode("  \r\n  "), "empty.txt"),
    ).rejects.toBeInstanceOf(SourceParseError);
  });
});
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfToText } from "./pdf-to-text";

/** Build a PDF where each inner array is the lines of one page. */
async function makePdf(pages: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const lines of pages) {
    const page = doc.addPage([595, 842]); // A4 in points
    lines.forEach((line, i) => {
      page.drawText(line, { x: 50, y: 780 - i * 20, size: 12, font });
    });
  }
  return doc.save();
}

const LONG_LINE = "Production show in the theatre at 19:30 tonight";

describe("pdfToText", () => {
  it("extracts text and labels the page", async () => {
    const result = await pdfToText(await makePdf([[LONG_LINE]]));

    expect(result.text).toContain("## Page 1");
    expect(result.text).toContain(LONG_LINE);
    expect(result.pageCount).toBe(1);
    expect(result.emptyPages).toEqual([]);
    expect(result.needsOcr).toBe(false);
  });

  it("keeps separate lines apart", async () => {
    const result = await pdfToText(
      await makePdf([["Monday 10 November", "Show at 19:30 in the theatre"]]),
    );

    expect(result.text).toMatch(/Monday 10 November\s+Show at 19:30/);
  });

  it("labels every page", async () => {
    const result = await pdfToText(
      await makePdf([[LONG_LINE], ["Second page with enough text in it ok"]]),
    );

    expect(result.text).toContain("## Page 1");
    expect(result.text).toContain("## Page 2");
    expect(result.pageCount).toBe(2);
  });

  it("flags a PDF with no text layer as needing OCR", async () => {
    const result = await pdfToText(await makePdf([[], []]));

    expect(result.text).toBe("");
    expect(result.emptyPages).toEqual([1, 2]);
    expect(result.needsOcr).toBe(true);
  });

  it("treats a lone page number as no real text", async () => {
    const result = await pdfToText(await makePdf([["Page 1"]]));

    expect(result.emptyPages).toEqual([1]);
    expect(result.needsOcr).toBe(true);
  });

  it("reports empty pages inside a mostly textual PDF without flagging OCR", async () => {
    const result = await pdfToText(await makePdf([[LONG_LINE], []]));

    expect(result.emptyPages).toEqual([2]);
    expect(result.needsOcr).toBe(false);
  });

  it("does not consume the caller's buffer", async () => {
    const bytes = await makePdf([[LONG_LINE]]);
    const lengthBefore = bytes.length;

    await pdfToText(bytes);

    expect(bytes.length).toBe(lengthBefore);
  });

  it("rejects bytes that are not a PDF", async () => {
    const junk = new TextEncoder().encode("this is not a pdf");
    await expect(pdfToText(junk)).rejects.toThrow();
  });
});
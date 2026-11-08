import { getDocumentProxy } from "unpdf";
import { itemsToLines, type PdfTextItem } from "./pdf-layout";

/**
 * A page with fewer non-whitespace characters than this counts as
 * "no real text". Scanned documents often still carry a tiny text
 * layer (a page number, a stamp), so 0 would be too strict.
 */
const MIN_CHARS_PER_PAGE = 30;

export type PdfTextResult = {
  /** Text of all pages, each preceded by a "## Page N" line. */
  text: string;
  pageCount: number;
  /** 1-based numbers of pages with (almost) no extractable text. */
  emptyPages: number[];
  /** True when every page is empty: the PDF is almost certainly scanned. */
  needsOcr: boolean;
};

/** The parts of a pdf.js text item that we use. */
type RawTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

/**
 * Extract text from a PDF, keeping table columns apart with " | ".
 *
 * Throws if the PDF is corrupt or password protected (pdf.js raises
 * InvalidPDFException / PasswordException); the caller decides how to
 * report that to the user.
 */
export async function pdfToText(bytes: Uint8Array): Promise<PdfTextResult> {
  // pdf.js takes ownership of the buffer it is given and detaches it,
  // which would leave the caller's array empty. Hand it a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));

  const pageCount = pdf.numPages;
  const emptyPages: number[] = [];
  const blocks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    // Typed as unknown first: the library mixes text items with
    // "marked content" markers, and the guard keeps only real text.
    const rawItems: unknown[] = content.items;
    const items = rawItems.filter(isTextItem).map(toPdfTextItem);

    const pageText = cleanPage(itemsToLines(items).join("\n"));

    if (pageText.replace(/\s/g, "").length < MIN_CHARS_PER_PAGE) {
      emptyPages.push(pageNumber);
    }
    if (pageText !== "") {
      blocks.push(`## Page ${pageNumber}\n${pageText}`);
    }
  }

  return {
    text: blocks.join("\n\n"),
    pageCount,
    emptyPages,
    needsOcr: pageCount > 0 && emptyPages.length === pageCount,
  };
}

function isTextItem(item: unknown): item is RawTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item
  );
}

function toPdfTextItem(item: RawTextItem): PdfTextItem {
  // transform is a 6-number matrix: [a, b, c, d, e, f].
  // e and f are the x and y position of the text on the page.
  return {
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width,
    height: item.height,
  };
}

function cleanPage(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "") // Postgres text columns reject NUL
    .trim();
}
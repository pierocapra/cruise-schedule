/** A piece of text with its position on the page, in PDF points. */
export type PdfTextItem = {
  str: string;
  x: number; // left edge
  y: number; // baseline; PDF origin is bottom-left, so larger y = higher up
  width: number;
  height: number; // roughly the font size
};

/** Items whose baselines differ by less than this many "em" share a line. */
const SAME_LINE_TOLERANCE_EM = 0.5;

/** A horizontal gap at least this many "em" wide is a column boundary. */
const COLUMN_GAP_EM = 0.8;

/** Used when pdf.js reports a height of 0. */
const FALLBACK_EM = 10;

type CleanItem = PdfTextItem & { em: number };
type Row = { y: number; items: CleanItem[] };

/**
 * Rebuild visual lines from positioned text items.
 *
 * Items on the same row are joined with " " when close together
 * (words inside one cell) and with " | " when far apart (a new column),
 * matching the format used for spreadsheets.
 */
export function itemsToLines(items: PdfTextItem[]): string[] {
  const clean: CleanItem[] = items
    .map((item) => ({
      ...item,
      str: item.str.replace(/\s+/g, " ").trim(),
      em: item.height > 0 ? item.height : FALLBACK_EM,
    }))
    .filter((item) => item.str !== "");

  // Top of the page first.
  clean.sort((a, b) => b.y - a.y);

  const rows: Row[] = [];
  for (const item of clean) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(item.y - row.y) <= item.em * SAME_LINE_TOLERANCE_EM) {
      row.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows.map(joinRow);
}

function joinRow(row: Row): string {
  const items = [...row.items].sort((a, b) => a.x - b.x);

  let line = items[0].str;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const current = items[i];
    const gap = current.x - (prev.x + prev.width);
    const isColumnBreak = gap >= Math.max(prev.em, current.em) * COLUMN_GAP_EM;

    line += (isColumnBreak ? " | " : " ") + current.str;
  }
  return line;
}
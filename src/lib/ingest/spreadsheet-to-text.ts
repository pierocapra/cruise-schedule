import * as XLSX from "xlsx";

/**
 * Convert an Excel workbook (.xlsx / .xls) into plain text for the LLM.
 *
 * Output shape:
 *
 *   ## Sheet: Week 46
 *   Date | Time | Event
 *   Mon 10 Nov | 19:30 | Show
 *
 * - One block per visible sheet, one line per non-empty row.
 * - Cells are joined with " | " so column positions stay readable.
 * - Values are the text Excel *displays* (19:30, not 0.8125).
 * - Cells merged across several rows are repeated on every row.
 */
export function spreadsheetToText(bytes: Uint8Array): string {
  const workbook = XLSX.read(bytes, {
    type: "array",
    // Dates with Excel's generic date format would otherwise render as
    // US-style "11/10/26", which is ambiguous. Force ISO instead.
    dateNF: "yyyy-mm-dd",
  });

  const blocks: string[] = [];

  workbook.SheetNames.forEach((name, index) => {
    if (isHidden(workbook, index)) return;

    const sheet = workbook.Sheets[name];
    fillMultiRowMerges(sheet);

    const lines = sheetToLines(sheet);
    if (lines.length === 0) return;

    blocks.push(`## Sheet: ${name}\n${lines.join("\n")}`);
  });

  return blocks.join("\n\n");
}

function isHidden(workbook: XLSX.WorkBook, index: number): boolean {
  // 0 = visible, 1 = hidden, 2 = "very hidden" (only reachable via VBA)
  const state = workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0;
  return state !== 0;
}

/**
 * Excel stores a merged cell's value only in its top-left cell.
 * For merges spanning more than one row (the "date per group of events"
 * pattern) copy that cell into every other cell of the range, so each
 * row carries its own date.
 *
 * Single-row merges are usually title banners, so we leave them alone.
 */
function fillMultiRowMerges(sheet: XLSX.WorkSheet): void {
  for (const merge of sheet["!merges"] ?? []) {
    if (merge.e.r === merge.s.r) continue;

    const origin = sheet[XLSX.utils.encode_cell(merge.s)];
    if (!origin) continue;

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue;
        sheet[XLSX.utils.encode_cell({ r, c })] = { ...origin };
      }
    }
  }
}

function sheetToLines(sheet: XLSX.WorkSheet): string[] {
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1, // array of arrays instead of objects keyed by header
    raw: false, // use the formatted text Excel displays
    defval: "", // empty cells become "" so columns keep their position
    blankrows: false,
  });

  return rows
    .map((row) => {
      const cells = row.map(cleanCell);
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      return cells.join(" | ");
    })
    .filter((line) => line !== "");
}

function cleanCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ") // newlines inside a cell would break "one row per line"
    .trim();
}
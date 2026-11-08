import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { spreadsheetToText } from "./spreadsheet-to-text";

function workbookOf(sheets: [string, XLSX.WorkSheet][]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [name, sheet] of sheets) {
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }
  return wb;
}

function toBytes(wb: XLSX.WorkBook): Uint8Array {
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}

describe("spreadsheetToText", () => {
  it("writes a sheet header and pipe-separated rows", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Time", "Event", "Venue"],
      ["19:30", "Show", "Theatre"],
    ]);
    const text = spreadsheetToText(toBytes(workbookOf([["Week 46", sheet]])));
    expect(text).toBe(
      "## Sheet: Week 46\nTime | Event | Venue\n19:30 | Show | Theatre",
    );
  });

  it("skips empty rows and trims trailing empty cells", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["a", "b", ""],
      [],
      ["", "", ""],
      ["c"],
    ]);
    const text = spreadsheetToText(toBytes(workbookOf([["S", sheet]])));
    expect(text).toBe("## Sheet: S\na | b\nc");
  });

  it("repeats a multi-row merged cell on every row of the merge", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Time", "Event"],
      ["Mon 10 Nov", "19:30", "Show"],
      [null, "21:00", "Late show"],
      ["Tue 11 Nov", "19:30", "Show"],
    ]);
    sheet["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }];

    const text = spreadsheetToText(toBytes(workbookOf([["S", sheet]])));
    expect(text).toBe(
      [
        "## Sheet: S",
        "Date | Time | Event",
        "Mon 10 Nov | 19:30 | Show",
        "Mon 10 Nov | 21:00 | Late show",
        "Tue 11 Nov | 19:30 | Show",
      ].join("\n"),
    );
  });

  it("does not repeat a single-row banner merge", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Production Theatre Week 46", null, null],
      ["19:30", "Show", "Theatre"],
    ]);
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

    const text = spreadsheetToText(toBytes(workbookOf([["S", sheet]])));
    expect(text).toBe(
      "## Sheet: S\nProduction Theatre Week 46\n19:30 | Show | Theatre",
    );
  });

  it("uses the displayed value of formatted cells, not the stored number", () => {
    const sheet = XLSX.utils.aoa_to_sheet([[0.8125]]);
    sheet["A1"].z = "hh:mm";

    const text = spreadsheetToText(toBytes(workbookOf([["S", sheet]])));
    expect(text).toBe("## Sheet: S\n19:30");
  });

  it("skips hidden sheets", () => {
    const visible = XLSX.utils.aoa_to_sheet([["x"]]);
    const hidden = XLSX.utils.aoa_to_sheet([["secret"]]);
    const wb = workbookOf([
      ["Visible", visible],
      ["Hidden", hidden],
    ]);
    wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };

    const text = spreadsheetToText(toBytes(wb));
    expect(text).toBe("## Sheet: Visible\nx");
    expect(text).not.toContain("secret");
  });

  it("returns an empty string for a workbook with no data", () => {
    const sheet = XLSX.utils.aoa_to_sheet([]);
    expect(spreadsheetToText(toBytes(workbookOf([["Empty", sheet]])))).toBe("");
  });
});
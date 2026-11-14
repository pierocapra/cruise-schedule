import { requireUser } from "@/lib/auth";

import { ParseButton } from "./parse-button";
import { DeleteButton } from "./delete-button";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

type ParseStatus = { label: string; className: string };

function describeStatus(
  parsedAt: string | null,
  needsOcr: boolean,
): ParseStatus {
  if (!parsedAt) {
    return { label: "Not parsed", className: "text-muted-foreground" };
  }
  if (needsOcr) {
    return {
      label: "Scanned PDF: no text found, needs OCR",
      className: "text-amber-700",
    };
  }
  return {
    label: `Parsed ${dateFormat.format(new Date(parsedAt))} UTC`,
    className: "text-green-700",
  };
}

export async function FilesContent() {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("source_files")
    .select(
      "id, file_name, file_type, storage_path, created_at, parsed_at, needs_ocr, parse_warnings",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Could not load files: {error.message}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No files uploaded yet.</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {data.map((file) => {
        const status = describeStatus(file.parsed_at, file.needs_ocr);
        const warnings: string[] = file.parse_warnings ?? [];

        return (
          <li key={file.id} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.file_type} ·{" "}
                  {dateFormat.format(new Date(file.created_at))} UTC
                </p>
                <p className={`text-xs ${status.className}`}>{status.label}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {file.storage_path && (
                  <ParseButton
                    sourceFileId={file.id}
                    alreadyParsed={file.parsed_at !== null}
                  />
                )}
                <DeleteButton sourceFileId={file.id} fileName={file.file_name} />
              </div>
            </div>

            {warnings.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-muted-foreground">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
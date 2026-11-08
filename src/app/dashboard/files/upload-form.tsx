"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "source-files";
const MAX_BYTES = 10 * 1024 * 1024; // keep in sync with the bucket's file_size_limit

type FileKind = "pdf" | "spreadsheet" | "text";

const ALLOWED: Record<string, { fileType: FileKind; contentType: string }> = {
  pdf: { fileType: "pdf", contentType: "application/pdf" },
  xlsx: {
    fileType: "spreadsheet",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  xls: { fileType: "spreadsheet", contentType: "application/vnd.ms-excel" },
  csv: { fileType: "spreadsheet", contentType: "text/csv" },
  txt: { fileType: "text", contentType: "text/plain" },
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

// Storage object keys reject many characters (spaces are risky, non-ASCII fails).
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    const info = ALLOWED[extensionOf(file.name)];
    if (!info) {
      setError("Unsupported file type. Use PDF, XLSX, XLS, CSV or TXT.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is larger than 10 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You are not signed in.");

      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: info.contentType,
          upsert: false,
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { error: insertError } = await supabase.from("source_files").insert({
        file_name: file.name,
        file_type: info.fileType,
        storage_path: storagePath,
      });

      if (insertError) {
        // Don't leave an orphaned object behind.
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw new Error(`Saving the file record failed: ${insertError.message}`);
      }

      setMessage(`Uploaded ${file.name}`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv,.txt"
        className="block w-full rounded-md border px-3 py-2"
      />
      <button
        type="submit"
        disabled={uploading}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
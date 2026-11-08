import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export async function FilesContent() {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_files")
    .select("id, file_name, file_type, storage_path, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Could not load files: {error.message}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No files uploaded yet.</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {data.map((file) => (
        <li key={file.id} className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {file.file_type} · {dateFormat.format(new Date(file.created_at))} UTC
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
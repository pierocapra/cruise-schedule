import { Suspense } from "react";
import { FilesContent } from "./files-content";
import { PasteForm } from "./paste-form";
import { UploadForm } from "./upload-form";

export default function FilesPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Source files</h1>
      <UploadForm />
      <PasteForm />
      <Suspense fallback={<p>Loading files…</p>}>
        <FilesContent />
      </Suspense>
    </main>
  );
}
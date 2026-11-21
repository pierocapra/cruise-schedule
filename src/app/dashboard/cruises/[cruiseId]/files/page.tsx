import { Suspense } from "react";

import { FilesContent } from "./files-content";
import { PasteForm } from "./paste-form";
import { UploadForm } from "./upload-form";
import Link from "next/link";

type FilesPageProps = {
  params: Promise<{ cruiseId: string }>;
};

async function FilesPageBody({ params }: FilesPageProps) {
  const { cruiseId } = await params;

  return (
    <>
      <Link
        href={`/dashboard/cruises/${cruiseId}/review`}
        className="text-sm underline"
      >
        Review events →
      </Link>
      <UploadForm cruiseId={cruiseId} />
      <PasteForm cruiseId={cruiseId} />
      <FilesContent cruiseId={cruiseId} />
    </>
  );
}

export default function FilesPage({ params }: FilesPageProps) {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Source files</h1>
      <Suspense fallback={<p>Loading files…</p>}>
        <FilesPageBody params={params} />
      </Suspense>
    </main>
  );
}
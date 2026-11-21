import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { ReviewContent } from "./review-content";

type ReviewPageProps = {
  params: Promise<{ cruiseId: string }>;
};

async function ReviewPageBody({ params }: ReviewPageProps) {
  const { cruiseId } = await params;

  if (!z.uuid().safeParse(cruiseId).success) {
    notFound();
  }

  return <ReviewContent cruiseId={cruiseId} />;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Suspense fallback={<p>Loading events…</p>}>
        <ReviewPageBody params={params} />
      </Suspense>
    </main>
  );
}
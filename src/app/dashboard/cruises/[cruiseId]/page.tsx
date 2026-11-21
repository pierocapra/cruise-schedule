import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";

import { ArchiveToggleButton } from "../archive-toggle-button";
import { CruiseDetails } from "./cruise-details";

type CruiseHubPageProps = {
  params: Promise<{ cruiseId: string }>;
};

async function CruiseHubContent({ params }: CruiseHubPageProps) {
  const { cruiseId } = await params;
  const { supabase } = await requireUser();

  const { data: cruise, error } = await supabase
    .from("cruises")
    .select("id, ship, start_date, end_date, itinerary_notes, archived_at")
    .eq("id", cruiseId)
    .maybeSingle();

  if (error) {
    return <p className="text-red-600">Could not load this cruise: {error.message}</p>;
  }

  if (!cruise) {
    notFound();
  }

  const isArchived = cruise.archived_at !== null;

  return (
    <div className="space-y-4">
      {isArchived && (
        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/50 p-3">
          <p className="text-sm">
            This cruise is archived. It is hidden from your main list, but
            everything in it is kept.
          </p>
          <ArchiveToggleButton cruiseId={cruise.id} archived />
        </div>
      )}

      <CruiseDetails cruise={cruise} />

      <ul className="space-y-1 text-sm">
        <li>
          <Link href={`/dashboard/cruises/${cruise.id}/files`} className="underline">
            Sources
          </Link>
        </li>
        <li>
          <Link href={`/dashboard/cruises/${cruise.id}/review`} className="underline">
            Review events
          </Link>
        </li>
        <li className="text-muted-foreground">Schedule (coming soon)</li>
        <li className="text-muted-foreground">Outputs (coming soon)</li>
      </ul>

      {!isArchived && (
        <ArchiveToggleButton cruiseId={cruise.id} archived={false} />
      )}
    </div>
  );
}

export default function CruiseHubPage({ params }: CruiseHubPageProps) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard/cruises" className="text-sm underline">
        ← All cruises
      </Link>
      <Suspense fallback={<p>Loading cruise…</p>}>
        <CruiseHubContent params={params} />
      </Suspense>
    </main>
  );
}
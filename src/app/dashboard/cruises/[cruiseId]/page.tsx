import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type CruiseHubPageProps = {
  params: Promise<{ cruiseId: string }>;
};

async function CruiseHubContent({ params }: CruiseHubPageProps) {
  const { cruiseId } = await params;
  const { supabase } = await requireUser();

  const { data: cruise, error } = await supabase
    .from("cruises")
    .select("id, ship, start_date, end_date, itinerary_notes")
    .eq("id", cruiseId)
    .maybeSingle();

  if (error) {
    return <p className="text-red-600">Could not load this cruise: {error.message}</p>;
  }

  if (!cruise) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{cruise.ship ?? "No ship set"}</h1>
        <p className="text-sm text-muted-foreground">
          {dateFormat.format(new Date(`${cruise.start_date}T00:00:00Z`))} –{" "}
          {dateFormat.format(new Date(`${cruise.end_date}T00:00:00Z`))}
        </p>
        {cruise.itinerary_notes && (
          <p className="text-sm text-muted-foreground">{cruise.itinerary_notes}</p>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        <li>
          <Link href={`/dashboard/cruises/${cruise.id}/files`} className="underline">
            Sources
          </Link>
        </li>
        <li className="text-muted-foreground">Review (coming soon)</li>
        <li className="text-muted-foreground">Schedule (coming soon)</li>
        <li className="text-muted-foreground">Outputs (coming soon)</li>
      </ul>
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
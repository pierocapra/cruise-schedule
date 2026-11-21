import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { inclusiveDayCount } from "@/lib/dates";

import { ArchiveToggleButton } from "./archive-toggle-button";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatRange(startDate: string, endDate: string): string {
  // Dates are plain YYYY-MM-DD with no time component, so parsing at
  // UTC midnight and formatting in UTC avoids a day shifting by timezone.
  const start = dateFormat.format(new Date(`${startDate}T00:00:00Z`));
  const end = dateFormat.format(new Date(`${endDate}T00:00:00Z`));
  const days = inclusiveDayCount(startDate, endDate);
  const dayLabel = days === 1 ? "1 day" : `${days} days`;

  return `${start} – ${end} (${dayLabel})`;
}

export async function CruisesContent() {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("cruises")
    .select("id, ship, start_date, end_date, archived_at")
    .order("start_date", { ascending: false });

  if (error) {
    return <p className="text-red-600">Could not load cruises: {error.message}</p>;
  }

  const cruises = data ?? [];
  const active = cruises.filter((cruise) => cruise.archived_at === null);
  const archived = cruises.filter((cruise) => cruise.archived_at !== null);

  if (cruises.length === 0) {
    return <p className="text-muted-foreground">No cruises yet.</p>;
  }

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <p className="text-muted-foreground">No active cruises.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {active.map((cruise) => (
            <li key={cruise.id} className="p-3">
              <Link href={`/dashboard/cruises/${cruise.id}`} className="block space-y-1">
                <p className="font-medium">{cruise.ship ?? "No ship set"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRange(cruise.start_date, cruise.end_date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="rounded-md border">
          <summary className="cursor-pointer p-3 text-sm font-medium">
            Archived ({archived.length})
          </summary>
          <ul className="divide-y border-t">
            {archived.map((cruise) => (
              <li
                key={cruise.id}
                className="flex items-start justify-between gap-4 p-3"
              >
                <Link
                  href={`/dashboard/cruises/${cruise.id}`}
                  className="block space-y-1"
                >
                  <p className="font-medium">{cruise.ship ?? "No ship set"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRange(cruise.start_date, cruise.end_date)} · Archived{" "}
                    {dateFormat.format(new Date(cruise.archived_at as string))}
                  </p>
                </Link>
                <ArchiveToggleButton cruiseId={cruise.id} archived />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
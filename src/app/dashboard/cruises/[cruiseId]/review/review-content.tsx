import Link from "next/link";
import { notFound } from "next/navigation";
import { MANUAL_FILE_TYPE } from "@/lib/extraction/manual-source";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";

import { EventRow } from "./event-row";
import { AddEventForm } from "./add-event-form";

import { ApproveRemainingButton } from "./approve-remaining-button";
import { findEventWarnings } from "@/lib/extraction/event-warnings";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const rangeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatEventDate(isoDate: string): string {
  // Midnight UTC + timeZone: "UTC" means the printed day can never shift.
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function formatRangeDate(isoDate: string): string {
  return rangeFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// Postgres returns time columns as "19:30:00"; the schedule only has HH:MM.
function hoursMinutes(time: string): string {
  return time.slice(0, 5);
}

function formatTimes(
  start: string | null,
  end: string | null,
  endsNextDay: boolean,
): string {
  const suffix = endsNextDay ? " (+1 day)" : "";

  if (start !== null && end !== null) {
    return `${hoursMinutes(start)}–${hoursMinutes(end)}${suffix}`;
  }
  if (start !== null) return hoursMinutes(start);
  if (end !== null) return `until ${hoursMinutes(end)}${suffix}`;
  return "No time";
}

type ReviewContentProps = {
  cruiseId: string;
};

export async function ReviewContent({ cruiseId }: ReviewContentProps) {
  const { supabase } = await requireUser();
  const cruisePath = `/dashboard/cruises/${cruiseId}`;

  const { data: cruise, error: cruiseError } = await supabase
    .from("cruises")
    .select("id, ship, start_date, end_date")
    .eq("id", cruiseId)
    .maybeSingle();

  if (cruiseError) {
    return (
      <p className="text-red-600">
        Could not load this cruise: {cruiseError.message}
      </p>
    );
  }

  if (!cruise) {
    notFound();
  }

  // Events have no cruise_id of their own (by design), so go through the
  // cruise's sources: first the sources, then their events.
  const { data: sources, error: sourcesError } = await supabase
    .from("source_files")
    .select("id, file_name, file_type")
    .eq("cruise_id", cruiseId);

  if (sourcesError) {
    return (
      <p className="text-red-600">
        Could not load sources: {sourcesError.message}
      </p>
    );
  }

  const fileNames = new Map<string, string>(
    (sources ?? []).map((source) => [source.id, source.file_name]),
  );

  const manualSourceIds = new Set(
  (sources ?? [])
    .filter((source) => source.file_type === MANUAL_FILE_TYPE)
    .map((source) => source.id),
);
const realSourceCount = (sources ?? []).length - manualSourceIds.size;

  let events: Array<{
    id: string;
    source_file_id: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    ends_next_day: boolean;
    venue: string | null;
    type: string;
    title: string;
    notes: string | null;
    source_snippet: string;
    reviewed: boolean;
  }> = [];

  if (fileNames.size > 0) {
    const { data, error: eventsError } = await supabase
      .from("extracted_events")
      .select(
        "id, source_file_id, event_date, start_time, end_time, ends_next_day, venue, type, title, notes, source_snippet, reviewed",
      )
      .in("source_file_id", [...fileNames.keys()])
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (eventsError) {
      return (
        <p className="text-red-600">
          Could not load events: {eventsError.message}
        </p>
      );
    }

    events = data ?? [];
  }

  const reviewedCount = events.filter((event) => event.reviewed).length;
  const manualEventCount = events.filter((event) =>
    manualSourceIds.has(event.source_file_id),
  ).length;
  const sourcesWithEvents = new Set(
    events
      .map((event) => event.source_file_id)
      .filter((id) => !manualSourceIds.has(id)),
  ).size;
  const warnings = findEventWarnings(events, cruise, fileNames);
  const pendingWithWarnings = events.filter(
    (event) => !event.reviewed && warnings.has(event.id),
  ).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href={cruisePath} className="text-sm underline">
          ← {cruise.ship ?? "No ship set"}
        </Link>
        <h1 className="text-xl font-semibold">Review events</h1>
        <p className="text-sm text-muted-foreground">
          {formatRangeDate(cruise.start_date)} – {formatRangeDate(cruise.end_date)} ·{" "}
          {events.length} events · {sourcesWithEvents} of {realSourceCount} sources
          {manualEventCount > 0 && ` · ${manualEventCount} added manually`} ·{" "}
          {warnings.size > 0 && ` · ${warnings.size} with warnings`} ·{" "}
          {reviewedCount} reviewed
        </p>
      </div>

      <AddEventForm cruiseId={cruiseId} defaultDate={cruise.start_date} />

      <ApproveRemainingButton
        cruiseId={cruiseId}
        pendingCount={events.length - reviewedCount}
        pendingWithWarnings={pendingWithWarnings}
      />

      {fileNames.size === 0 ? (
        <p className="text-muted-foreground">
          This cruise has no sources yet.{" "}
          <Link href={`${cruisePath}/files`} className="underline">
            Add one in Sources
          </Link>
          .
        </p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">
          No events yet. Run Extract on a source in{" "}
          <Link href={`${cruisePath}/files`} className="underline">
            Sources
          </Link>
          , or add one manually above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
             <EventRow
              key={event.id}
              event={event}
              fileName={fileNames.get(event.source_file_id) ?? "Unknown source"}
              cruiseId={cruiseId}
              warnings={warnings.get(event.id) ?? []}
            />
            ))}
          </TableBody>
        </Table>
      )}
    </div>

  );
}
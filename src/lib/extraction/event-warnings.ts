export type EventWarning = {
  kind: "duplicate" | "outside_dates";
  message: string;
};

// The fields the rules need; a review row has all of them.
export type WarnableEvent = {
  id: string;
  event_date: string;
  start_time: string | null;
  title: string;
  source_file_id: string;
};

export type WarningCruise = {
  start_date: string;
  end_date: string;
};

/** Lowercase, punctuation to spaces, whitespace collapsed. Unicode-safe. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Warnings for a cruise's events, keyed by event id. Only events that have
 * at least one warning appear. Warnings never block anything.
 */
export function findEventWarnings(
  events: readonly WarnableEvent[],
  cruise: WarningCruise,
  fileNames: ReadonlyMap<string, string>,
): Map<string, EventWarning[]> {
  const warnings = new Map<string, EventWarning[]>();

  function add(eventId: string, warning: EventWarning) {
    const list = warnings.get(eventId);
    if (list) {
      list.push(warning);
    } else {
      warnings.set(eventId, [warning]);
    }
  }

  // Outside the cruise's dates. ISO dates compare correctly as text, and
  // the first and last day themselves are fine.
  for (const event of events) {
    if (event.event_date < cruise.start_date || event.event_date > cruise.end_date) {
      add(event.id, {
        kind: "outside_dates",
        message: "Outside the cruise dates",
      });
    }
  }

  // Duplicates: same date, start time and normalised title.
  const groups = new Map<string, WarnableEvent[]>();
  for (const event of events) {
    const key = `${event.event_date}|${event.start_time ?? ""}|${normalizeTitle(event.title)}`;
    const group = groups.get(key);
    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    for (const event of group) {
      const otherNames = [
        ...new Set(
          group
            .filter((other) => other.id !== event.id)
            .map((other) => fileNames.get(other.source_file_id) ?? "another source"),
        ),
      ];

      add(event.id, {
        kind: "duplicate",
        message: `Possible duplicate: same date, time and title also in ${otherNames.join(", ")}`,
      });
    }
  }

  return warnings;
}
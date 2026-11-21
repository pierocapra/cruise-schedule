const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatEventDate(isoDate: string): string {
  // Midnight UTC + timeZone: "UTC" means the printed day can never shift.
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// Postgres returns time columns as "19:30:00"; the schedule only has HH:MM.
export function hoursMinutes(time: string): string {
  return time.slice(0, 5);
}

export function formatTimes(
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
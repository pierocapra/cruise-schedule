export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMs(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  return Date.UTC(year, month - 1, day);
}

/**
 * True only for a real calendar date written as YYYY-MM-DD.
 * Malformed text is false, and so is a date that rolls over (2026-02-30).
 */
export function isRealIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(toUtcMs(value));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Number of calendar days from start to end, counting both. Same day is 1,
 * a Monday to the following Sunday is 7. Returns 0 or less when end is
 * before start. Both arguments must be real dates.
 */
export function inclusiveDayCount(start: string, end: string): number {
  if (!isRealIsoDate(start) || !isRealIsoDate(end)) {
    throw new Error("inclusiveDayCount needs two real YYYY-MM-DD dates");
  }

  return (toUtcMs(end) - toUtcMs(start)) / MS_PER_DAY + 1;
}
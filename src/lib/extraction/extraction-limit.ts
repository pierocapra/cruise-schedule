const DEFAULT_DAILY_LIMIT = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Reads the per-user daily extraction limit. Only a positive whole number is
 * accepted; anything else (missing, "abc", "0", "2.5") falls back to the
 * default, so a typo in the env var can never switch the limit off.
 */
export function readDailyLimit(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

export const MAX_DAILY_EXTRACTIONS = readDailyLimit(
  process.env.MAX_DAILY_EXTRACTIONS,
);

/** The start of the rolling 24-hour window, as an ISO timestamp. */
export function extractionWindowStart(now: Date = new Date()): string {
  return new Date(now.getTime() - WINDOW_MS).toISOString();
}
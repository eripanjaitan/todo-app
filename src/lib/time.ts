// Asia/Jakarta is UTC+7 year-round (no DST), so a fixed offset is exact.
export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Convert a Jakarta wall-clock string ("YYYY-MM-DDTHH:mm") to a UTC Date.
 * Returns null if the format is wrong or the date does not exist (e.g. 2026-02-31).
 */
export function jakartaLocalToUtc(local: string): Date | null {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  if (mo < 1 || mo > 12 || h > 23 || mi > 59) return null;

  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (
    wall.getUTCFullYear() !== y ||
    wall.getUTCMonth() !== mo - 1 ||
    wall.getUTCDate() !== d
  ) {
    return null;
  }
  return new Date(wall.getTime() - JAKARTA_OFFSET_MS);
}

/** Format a UTC instant for display in Asia/Jakarta (AC-37). */
export function formatJakarta(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date) + " WIB";
}

/** Next 09:00 Jakarta time strictly after the calendar day of `now` in Jakarta. */
export function tomorrowNineJakarta(now: Date): Date {
  const jakarta = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const target = Date.UTC(
    jakarta.getUTCFullYear(),
    jakarta.getUTCMonth(),
    jakarta.getUTCDate() + 1,
    9,
    0,
  );
  return new Date(target - JAKARTA_OFFSET_MS);
}

export const SNOOZE_OPTIONS = ["10m", "1h", "tomorrow9"] as const;
export type SnoozeOption = (typeof SNOOZE_OPTIONS)[number];

/** AC-33: snooze targets. */
export function snoozeTarget(option: SnoozeOption, now: Date): Date {
  switch (option) {
    case "10m":
      return new Date(now.getTime() + 10 * 60 * 1000);
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "tomorrow9":
      return tomorrowNineJakarta(now);
  }
}

/** AC-22: a reminder may not be set before the current instant. */
export function isInPast(due: Date, now: Date): boolean {
  return due.getTime() < now.getTime();
}

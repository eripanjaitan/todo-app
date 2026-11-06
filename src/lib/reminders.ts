import type { ReminderRepeat } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

/** AC-38: a reminder is due when its time has been reached, including the exact instant. */
export function isDueAt(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() <= now.getTime();
}

/** AC-30 panel rule: active (not dismissed) and due. Late reminders still count. */
export function isPanelDue(
  reminder: { dueAt: Date; dismissed: boolean },
  now: Date,
): boolean {
  return !reminder.dismissed && isDueAt(reminder.dueAt, now);
}

/**
 * AC-25a: after a daily repeat is dismissed, move to the first daily occurrence
 * strictly after `now`. Jakarta has no DST, so adding 24h keeps the local time.
 */
export function advanceDaily(dueAt: Date, now: Date): Date {
  let next = dueAt.getTime() + DAY_MS;
  while (next <= now.getTime()) next += DAY_MS;
  return new Date(next);
}

export function isRepeating(repeat: ReminderRepeat): boolean {
  return repeat === "DAILY";
}

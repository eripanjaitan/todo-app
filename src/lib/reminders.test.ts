import { describe, expect, it } from "vitest";
import { advanceDaily, isDueAt, isPanelDue } from "./reminders";

describe("due logic (AC-38, AC-30)", () => {
  const now = new Date("2026-11-07T02:00:00.000Z");

  it("treats the exact due instant as due (boundary)", () => {
    expect(isDueAt(now, now)).toBe(true);
  });
  it("is not due one millisecond before", () => {
    expect(isDueAt(new Date(now.getTime() + 1), now)).toBe(false);
  });
  it("shows late reminders in the panel while not dismissed", () => {
    expect(isPanelDue({ dueAt: new Date("2026-11-06T00:00:00.000Z"), dismissed: false }, now)).toBe(true);
  });
  it("hides dismissed reminders from the panel (AC-32)", () => {
    expect(isPanelDue({ dueAt: new Date("2026-11-06T00:00:00.000Z"), dismissed: true }, now)).toBe(false);
  });
});

describe("advanceDaily (AC-25a)", () => {
  it("moves one day forward when the reminder was just due", () => {
    const due = new Date("2026-11-07T02:00:00.000Z");
    expect(advanceDaily(due, due).toISOString()).toBe("2026-11-08T02:00:00.000Z");
  });
  it("skips missed days so the next occurrence is in the future", () => {
    const due = new Date("2026-11-01T02:00:00.000Z");
    const now = new Date("2026-11-07T05:00:00.000Z");
    const next = advanceDaily(due, now);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(next.toISOString()).toBe("2026-11-08T02:00:00.000Z");
  });
});

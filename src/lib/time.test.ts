import { describe, expect, it } from "vitest";
import { formatJakarta, isInPast, jakartaLocalToUtc, snoozeTarget, tomorrowNineJakarta } from "./time";

describe("jakartaLocalToUtc (AC-16, AC-20, AC-36)", () => {
  it("converts Jakarta wall time to UTC (UTC+7)", () => {
    expect(jakartaLocalToUtc("2026-11-07T09:00")?.toISOString()).toBe("2026-11-07T02:00:00.000Z");
  });

  it("handles midnight crossing into the previous UTC day", () => {
    expect(jakartaLocalToUtc("2026-11-07T00:30")?.toISOString()).toBe("2026-11-06T17:30:00.000Z");
  });

  it("rejects malformed input and impossible dates", () => {
    expect(jakartaLocalToUtc("2026-11-07 09:00")).toBeNull();
    expect(jakartaLocalToUtc("2026-02-31T09:00")).toBeNull();
    expect(jakartaLocalToUtc("2026-11-07T25:00")).toBeNull();
  });
});

describe("isInPast (AC-22)", () => {
  const now = new Date("2026-11-07T02:00:00.000Z");
  it("is true for an instant before now", () => {
    expect(isInPast(new Date("2026-11-07T01:59:59.000Z"), now)).toBe(true);
  });
  it("is false for now and later", () => {
    expect(isInPast(now, now)).toBe(false);
    expect(isInPast(new Date("2026-11-07T03:00:00.000Z"), now)).toBe(false);
  });
});

describe("snooze targets (AC-33)", () => {
  const now = new Date("2026-11-07T02:00:00.000Z");
  it("10 minutes and 1 hour add to now", () => {
    expect(snoozeTarget("10m", now).toISOString()).toBe("2026-11-07T02:10:00.000Z");
    expect(snoozeTarget("1h", now).toISOString()).toBe("2026-11-07T03:00:00.000Z");
  });
  it("tomorrow 09:00 is the next Jakarta day at 09:00", () => {
    // 02:00Z on 7 Nov is 09:00 WIB on 7 Nov, so tomorrow 09:00 is 8 Nov 09:00 WIB = 8 Nov 02:00Z.
    expect(tomorrowNineJakarta(now).toISOString()).toBe("2026-11-08T02:00:00.000Z");
  });
  it("uses the Jakarta calendar day near UTC midnight", () => {
    // 18:00Z on 7 Nov is 01:00 WIB on 8 Nov, so tomorrow 09:00 is 9 Nov 09:00 WIB.
    expect(tomorrowNineJakarta(new Date("2026-11-07T18:00:00.000Z")).toISOString()).toBe("2026-11-09T02:00:00.000Z");
  });
});

describe("formatJakarta (AC-37)", () => {
  it("shows Jakarta wall time, not UTC", () => {
    // 02:00 UTC is 09:00 in Jakarta.
    const text = formatJakarta(new Date("2026-11-07T02:00:00.000Z"));
    expect(text).toContain("09:00");
    expect(text).toContain("Nov 2026");
    expect(text).toContain("WIB");
    expect(text).not.toContain("02:00");
  });
});

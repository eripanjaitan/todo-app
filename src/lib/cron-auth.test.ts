import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

describe("isAuthorizedCron (AC-27)", () => {
  const secret = "cron-secret-value";
  it("accepts the exact Bearer token", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("rejects a missing header, wrong token, or missing server secret", () => {
    expect(isAuthorizedCron(null, secret)).toBe(false);
    expect(isAuthorizedCron("Bearer wrong", secret)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${secret}`, undefined)).toBe(false);
  });
});

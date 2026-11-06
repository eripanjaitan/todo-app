import { beforeAll, describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

describe("session tokens (AC-11, AC-12)", () => {
  it("round-trips slug and session version", async () => {
    const token = await signSession({ slug: "home", sv: 3 });
    expect(await verifySession(token)).toEqual({ slug: "home", sv: 3 });
  });

  it("rejects a token signed with a different key", async () => {
    const token = await signSession({ slug: "home", sv: 1 });
    process.env.SESSION_SECRET = "a-different-secret-that-is-also-long-enough";
    expect(await verifySession(token)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";
  });

  it("rejects garbage", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
  });

  it("refuses to run without SESSION_SECRET (AC-11)", async () => {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    await expect(signSession({ slug: "home", sv: 1 })).rejects.toThrow("SESSION_SECRET");
    process.env.SESSION_SECRET = saved;
  });
});

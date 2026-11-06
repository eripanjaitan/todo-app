import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for Upstash Redis, shared by the mocked module below.
const store = vi.hoisted(() => {
  const data = new Map<string, number>();
  const redis = {
    incr: async (k: string) => {
      const v = (data.get(k) ?? 0) + 1;
      data.set(k, v);
      return v;
    },
    expire: async () => 1,
    set: async (k: string, v: unknown) => {
      data.set(k, Number(v) || 1);
      return "OK";
    },
    del: async (k: string) => (data.delete(k) ? 1 : 0),
    exists: async (k: string) => (data.has(k) ? 1 : 0),
  };
  return { data, redis };
});

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => store.redis } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return null;
    }
    async limit() {
      return { success: true };
    }
  },
}));

import {
  clearFailedUnlocks,
  isWorkspaceLocked,
  recordFailedUnlock,
} from "./rate-limit";

beforeEach(() => {
  store.data.clear();
});

describe("unlock lock (AC-15, AC-42)", () => {
  it("does not lock before the 5th failure", async () => {
    for (let i = 0; i < 4; i++) expect((await recordFailedUnlock("home")).locked).toBe(false);
    expect(await isWorkspaceLocked("home")).toBe(false);
  });

  it("locks on the 5th failure", async () => {
    for (let i = 0; i < 4; i++) await recordFailedUnlock("home");
    expect((await recordFailedUnlock("home")).locked).toBe(true);
    expect(await isWorkspaceLocked("home")).toBe(true);
  });

  it("a successful unlock resets the count, so 4 failures before and after do not lock", async () => {
    for (let i = 0; i < 4; i++) await recordFailedUnlock("home");
    await clearFailedUnlocks("home");
    for (let i = 0; i < 4; i++) await recordFailedUnlock("home");
    expect(await isWorkspaceLocked("home")).toBe(false);
  });

  it("locks are per workspace", async () => {
    for (let i = 0; i < 5; i++) await recordFailedUnlock("home");
    expect(await isWorkspaceLocked("office")).toBe(false);
  });
});

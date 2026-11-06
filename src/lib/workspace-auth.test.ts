import { beforeAll, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { signSession } from "./session";
import { getWorkspaceSession } from "./workspace-auth";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

describe("getWorkspaceSession (AC-5, AC-12)", () => {
  it("returns null without a cookie", async () => {
    jar.get.mockReturnValue(undefined);
    expect(await getWorkspaceSession("home")).toBeNull();
  });

  it("rejects a session issued before a sign-out (stale session version, m3)", async () => {
    jar.get.mockReturnValue({ value: await signSession({ slug: "home", sv: 1 }) });
    db.workspace.findUnique.mockResolvedValue({ id: "ws1", sessionVersion: 2 });
    expect(await getWorkspaceSession("home")).toBeNull();
  });

  it("accepts a session whose version matches the workspace", async () => {
    jar.get.mockReturnValue({ value: await signSession({ slug: "home", sv: 2 }) });
    db.workspace.findUnique.mockResolvedValue({ id: "ws1", sessionVersion: 2 });
    expect(await getWorkspaceSession("home")).toEqual({ workspaceId: "ws1" });
  });

  it("rejects a token issued for a different workspace slug", async () => {
    jar.get.mockReturnValue({ value: await signSession({ slug: "other", sv: 2 }) });
    db.workspace.findUnique.mockResolvedValue({ id: "ws1", sessionVersion: 2 });
    expect(await getWorkspaceSession("home")).toBeNull();
  });
});

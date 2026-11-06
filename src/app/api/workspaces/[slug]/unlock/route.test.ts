import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn() } }));
const rl = vi.hoisted(() => ({
  LOCKED_MESSAGE: "Too many failed attempts. Try again in 15 minutes.",
  allowUnlockAttempt: vi.fn(),
  recordFailedUnlock: vi.fn(),
  clearFailedUnlocks: vi.fn(),
  isWorkspaceLocked: vi.fn(),
}));
const auth = vi.hoisted(() => ({ setWorkspaceCookie: vi.fn() }));
const pw = vi.hoisted(() => ({ verifyAccessCode: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/rate-limit", () => rl);
vi.mock("@/lib/workspace-auth", () => auth);
vi.mock("@/lib/password", () => pw);

import { POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list" }) };
const req = (body: unknown) =>
  new Request("http://localhost/api/workspaces/home-list/unlock", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.5" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  rl.allowUnlockAttempt.mockReset().mockResolvedValue(true);
  rl.recordFailedUnlock.mockReset().mockResolvedValue({ locked: false });
  rl.clearFailedUnlocks.mockReset().mockResolvedValue(undefined);
  rl.isWorkspaceLocked.mockReset().mockResolvedValue(false);
  db.workspace.findUnique.mockReset();
  pw.verifyAccessCode.mockReset();
  auth.setWorkspaceCookie.mockReset();
});

describe("POST /api/workspaces/[slug]/unlock", () => {
  it("returns 429 when rate limited (AC-14)", async () => {
    rl.allowUnlockAttempt.mockResolvedValue(false);
    const res = await POST(req({ accessCode: "x" }), ctx);
    expect(res.status).toBe(429);
    expect(db.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing code", async () => {
    expect((await POST(req({}), ctx)).status).toBe(400);
  });

  it("refuses every attempt while the workspace is locked, even with the right code (AC-42)", async () => {
    rl.isWorkspaceLocked.mockResolvedValue(true);
    const res = await POST(req({ accessCode: "right-code" }), ctx);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe(rl.LOCKED_MESSAGE);
    expect(pw.verifyAccessCode).not.toHaveBeenCalled();
    expect(auth.setWorkspaceCookie).not.toHaveBeenCalled();
  });

  it("returns the same 401 for an unknown slug and does not count it (AC-4)", async () => {
    db.workspace.findUnique.mockResolvedValue(null);
    const res = await POST(req({ accessCode: "anything" }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid workspace or access code");
    expect(rl.recordFailedUnlock).not.toHaveBeenCalled();
  });

  it("returns the same 401 for a wrong code and counts the failure (AC-4, AC-15)", async () => {
    db.workspace.findUnique.mockResolvedValue({ name: "Home", codeHash: "h", sessionVersion: 1 });
    pw.verifyAccessCode.mockResolvedValue(false);
    const res = await POST(req({ accessCode: "wrong-code" }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid workspace or access code");
    expect(rl.recordFailedUnlock).toHaveBeenCalledWith("home-list");
    expect(auth.setWorkspaceCookie).not.toHaveBeenCalled();
  });

  it("returns the lock message on the failure that triggers the lock (AC-42)", async () => {
    db.workspace.findUnique.mockResolvedValue({ name: "Home", codeHash: "h", sessionVersion: 1 });
    pw.verifyAccessCode.mockResolvedValue(false);
    rl.recordFailedUnlock.mockResolvedValue({ locked: true });
    const res = await POST(req({ accessCode: "wrong-code" }), ctx);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe(rl.LOCKED_MESSAGE);
  });

  it("resets the failure count and sets the session cookie on success (AC-3, AC-42)", async () => {
    db.workspace.findUnique.mockResolvedValue({ name: "Home", codeHash: "h", sessionVersion: 4 });
    pw.verifyAccessCode.mockResolvedValue(true);
    const res = await POST(req({ accessCode: "right-code" }), ctx);
    expect(res.status).toBe(200);
    expect(rl.clearFailedUnlocks).toHaveBeenCalledWith("home-list");
    expect(auth.setWorkspaceCookie).toHaveBeenCalledWith("home-list", 4);
    expect(await res.json()).toEqual({ slug: "home-list", name: "Home" });
  });
});

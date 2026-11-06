import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn(), update: vi.fn() } }));
const rl = vi.hoisted(() => ({
  LOCKED_MESSAGE: "Too many failed attempts. Try again in 15 minutes.",
  allowUnlockAttempt: vi.fn(),
  recordFailedUnlock: vi.fn(),
  clearFailedUnlocks: vi.fn(),
  isWorkspaceLocked: vi.fn(),
}));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn(), setWorkspaceCookie: vi.fn() }));
const pw = vi.hoisted(() => ({ hashAccessCode: vi.fn(), verifyAccessCode: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/rate-limit", () => rl);
vi.mock("@/lib/workspace-auth", () => auth);
vi.mock("@/lib/password", () => pw);

import { POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list" }) };
const req = (body: unknown) =>
  new Request("http://localhost/api/workspaces/home-list/access-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  auth.setWorkspaceCookie.mockReset();
  rl.allowUnlockAttempt.mockReset().mockResolvedValue(true);
  rl.recordFailedUnlock.mockReset().mockResolvedValue({ locked: false });
  rl.clearFailedUnlocks.mockReset().mockResolvedValue(undefined);
  rl.isWorkspaceLocked.mockReset().mockResolvedValue(false);
  db.workspace.findUnique.mockReset().mockResolvedValue({ codeHash: "old-hash" });
  db.workspace.update.mockReset().mockResolvedValue({ sessionVersion: 2 });
  pw.hashAccessCode.mockReset().mockResolvedValue("new-hash");
  pw.verifyAccessCode.mockReset();
});

describe("POST /api/workspaces/[slug]/access-code (AC-6, AC-42, AC-44)", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await POST(req({ currentCode: "a", newCode: "12345678" }), ctx);
    expect(res.status).toBe(401);
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("refuses while the workspace is locked (AC-42)", async () => {
    rl.isWorkspaceLocked.mockResolvedValue(true);
    const res = await POST(req({ currentCode: "right-code", newCode: "12345678" }), ctx);
    expect(res.status).toBe(429);
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("rejects a wrong current code and changes nothing", async () => {
    pw.verifyAccessCode.mockResolvedValue(false);
    const res = await POST(req({ currentCode: "wrong", newCode: "12345678" }), ctx);
    expect(res.status).toBe(401);
    expect(rl.recordFailedUnlock).toHaveBeenCalledWith("home-list");
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("stores the new hash and bumps the session version (AC-44)", async () => {
    pw.verifyAccessCode.mockResolvedValue(true);
    const res = await POST(req({ currentCode: "right-code", newCode: "12345678" }), ctx);
    expect(res.status).toBe(200);
    expect(db.workspace.update.mock.calls[0][0].data).toEqual({
      codeHash: "new-hash",
      sessionVersion: { increment: 1 },
    });
  });

  it("keeps only this device signed in by re-issuing its cookie with the new version (AC-44)", async () => {
    pw.verifyAccessCode.mockResolvedValue(true);
    await POST(req({ currentCode: "right-code", newCode: "12345678" }), ctx);
    expect(auth.setWorkspaceCookie).toHaveBeenCalledWith("home-list", 2);
    expect(rl.clearFailedUnlocks).toHaveBeenCalledWith("home-list");
  });
});

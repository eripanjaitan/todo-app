import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn(), update: vi.fn() } }));
const rl = vi.hoisted(() => ({ allowUnlockAttempt: vi.fn(), recordFailedUnlock: vi.fn() }));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
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
  rl.allowUnlockAttempt.mockReset().mockResolvedValue(true);
  rl.recordFailedUnlock.mockReset().mockResolvedValue(1);
  db.workspace.findUnique.mockReset().mockResolvedValue({ codeHash: "old-hash" });
  db.workspace.update.mockReset();
  pw.hashAccessCode.mockReset().mockResolvedValue("new-hash");
  pw.verifyAccessCode.mockReset();
});

describe("POST /api/workspaces/[slug]/access-code (AC-6)", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await POST(req({ currentCode: "a", newCode: "12345678" }), ctx);
    expect(res.status).toBe(401);
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("rejects a wrong current code and changes nothing", async () => {
    pw.verifyAccessCode.mockResolvedValue(false);
    const res = await POST(req({ currentCode: "wrong", newCode: "12345678" }), ctx);
    expect(res.status).toBe(401);
    expect(rl.recordFailedUnlock).toHaveBeenCalledWith("home-list");
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("stores a new hash when the current code is correct", async () => {
    pw.verifyAccessCode.mockResolvedValue(true);
    const res = await POST(req({ currentCode: "right-code", newCode: "12345678" }), ctx);
    expect(res.status).toBe(200);
    expect(db.workspace.update.mock.calls[0][0].data).toEqual({ codeHash: "new-hash" });
  });
});

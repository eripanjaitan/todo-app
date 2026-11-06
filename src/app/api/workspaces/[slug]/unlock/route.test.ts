import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn() } }));
const rl = vi.hoisted(() => ({ allowUnlockAttempt: vi.fn(), recordFailedUnlock: vi.fn() }));
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
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  rl.allowUnlockAttempt.mockReset().mockResolvedValue(true);
  rl.recordFailedUnlock.mockReset().mockResolvedValue(1);
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
    const res = await POST(req({}), ctx);
    expect(res.status).toBe(400);
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

  it("sets the session cookie with the current session version on success (AC-3)", async () => {
    db.workspace.findUnique.mockResolvedValue({ name: "Home", codeHash: "h", sessionVersion: 4 });
    pw.verifyAccessCode.mockResolvedValue(true);
    const res = await POST(req({ accessCode: "right-code" }), ctx);
    expect(res.status).toBe(200);
    expect(auth.setWorkspaceCookie).toHaveBeenCalledWith("home-list", 4);
    expect(await res.json()).toEqual({ slug: "home-list", name: "Home" });
  });
});

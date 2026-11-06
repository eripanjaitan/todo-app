import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { update: vi.fn() } }));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn(), setWorkspaceCookie: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list" }) };
const req = () => new Request("http://localhost/api/workspaces/home-list/sign-out-others", { method: "POST" });

beforeEach(() => {
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  auth.setWorkspaceCookie.mockReset();
  db.workspace.update.mockReset().mockResolvedValue({ sessionVersion: 2 });
});

describe("POST /api/workspaces/[slug]/sign-out-others (AC-12, AC-13)", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    expect((await POST(req(), ctx)).status).toBe(401);
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("increments the session version and re-issues this device's cookie", async () => {
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(db.workspace.update.mock.calls[0][0].data).toEqual({ sessionVersion: { increment: 1 } });
    expect(auth.setWorkspaceCookie).toHaveBeenCalledWith("home-list", 2);
  });
});

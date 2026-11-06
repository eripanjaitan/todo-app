import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn(), create: vi.fn() } }));
const auth = vi.hoisted(() => ({ setWorkspaceCookie: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);
vi.mock("@/lib/password", () => ({ hashAccessCode: async () => "hashed-code" }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const valid = { slug: "home-list", name: "Home", accessCode: "12345678" };

beforeEach(() => {
  db.workspace.findUnique.mockReset();
  db.workspace.create.mockReset();
  auth.setWorkspaceCookie.mockReset();
});

describe("POST /api/workspaces (AC-1)", () => {
  it("rejects an invalid slug with 400", async () => {
    const res = await POST(req({ ...valid, slug: "Bad Slug" }));
    expect(res.status).toBe(400);
    expect(db.workspace.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the slug is taken", async () => {
    db.workspace.findUnique.mockResolvedValue({ id: "w1" });
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect(db.workspace.create).not.toHaveBeenCalled();
  });

  it("stores only the hash, sets the session cookie, and returns 201", async () => {
    db.workspace.findUnique.mockResolvedValue(null);
    db.workspace.create.mockResolvedValue({ slug: "home-list", name: "Home", sessionVersion: 1 });
    const res = await POST(req(valid));
    expect(res.status).toBe(201);
    expect(db.workspace.create.mock.calls[0][0].data).toEqual({
      slug: "home-list",
      name: "Home",
      codeHash: "hashed-code",
    });
    expect(auth.setWorkspaceCookie).toHaveBeenCalledWith("home-list", 1);
    expect(await res.json()).toEqual({ slug: "home-list", name: "Home" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  task: { findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  reminder: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { DELETE, PATCH } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list", id: "t1" }) };
const patch = (body: unknown) =>
  new Request("http://localhost/api/workspaces/home-list/tasks/t1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  db.task.findFirst.mockReset().mockResolvedValue({ id: "t1", completed: false });
  db.task.update.mockReset().mockReturnValue("pending-update");
  db.task.deleteMany.mockReset();
  db.reminder.deleteMany.mockReset().mockReturnValue("pending-delete");
  db.$transaction.mockReset();
});

describe("PATCH /api/workspaces/[slug]/tasks/[id] (AC-17, AC-24)", () => {
  it("cancels the reminder in the same transaction when a task is completed", async () => {
    db.$transaction.mockResolvedValue([{ count: 1 }, { id: "t1", title: "Done", notes: null, completed: true }]);
    const res = await PATCH(patch({ completed: true }), ctx);
    expect(res.status).toBe(200);
    expect(db.reminder.deleteMany).toHaveBeenCalledWith({ where: { taskId: "t1", workspaceId: "ws1" } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ id: "t1", title: "Done", notes: null, completed: true });
  });

  it("does not touch reminders for a title-only edit", async () => {
    db.task.update.mockReturnValue("pending-update");
    db.$transaction.mockResolvedValue([]);
    db.task.findFirst.mockResolvedValue({ id: "t1", completed: false });
    await PATCH(patch({ title: "Renamed" }), ctx);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a task in another workspace", async () => {
    db.task.findFirst.mockResolvedValue(null);
    const res = await PATCH(patch({ title: "x" }), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects an empty update with 400", async () => {
    const res = await PATCH(patch({}), ctx);
    expect(res.status).toBe(400);
    expect(db.task.findFirst).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/workspaces/[slug]/tasks/[id]", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when nothing in this workspace matched", async () => {
    db.task.deleteMany.mockResolvedValue({ count: 0 });
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(404);
    expect(db.task.deleteMany).toHaveBeenCalledWith({ where: { id: "t1", workspaceId: "ws1" } });
  });
});

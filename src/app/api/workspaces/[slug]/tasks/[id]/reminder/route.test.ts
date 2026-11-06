import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  task: { findFirst: vi.fn() },
  reminder: { upsert: vi.fn(), deleteMany: vi.fn() },
}));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { DELETE, PUT } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list", id: "t1" }) };
const put = (body: unknown) =>
  new Request("http://localhost/api/workspaces/home-list/tasks/t1/reminder", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  db.task.findFirst.mockReset().mockResolvedValue({ id: "t1", completed: false });
  db.reminder.upsert.mockReset().mockResolvedValue({
    id: "r1",
    dueAt: new Date("2099-01-01T02:00:00.000Z"),
    repeat: "DAILY",
    dismissed: false,
  });
});

describe("PUT /api/workspaces/[slug]/tasks/[id]/reminder (AC-20, AC-22)", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await PUT(put({ dueLocal: "2099-01-01T09:00" }), ctx);
    expect(res.status).toBe(401);
  });

  it("rejects a malformed time with 400", async () => {
    const res = await PUT(put({ dueLocal: "tomorrow morning" }), ctx);
    expect(res.status).toBe(400);
  });

  it("rejects a time in the past (Jakarta) with 400 (AC-22)", async () => {
    const res = await PUT(put({ dueLocal: "2000-01-01T09:00" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("in the past");
    expect(db.reminder.upsert).not.toHaveBeenCalled();
  });

  it("stores the Jakarta time as UTC and one reminder per task (AC-20, AC-23)", async () => {
    const res = await PUT(put({ dueLocal: "2099-01-01T09:00", repeat: "DAILY" }), ctx);
    expect(res.status).toBe(200);
    const args = db.reminder.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ taskId: "t1" });
    expect(args.create.dueAt.toISOString()).toBe("2099-01-01T02:00:00.000Z");
    expect(args.create.repeat).toBe("DAILY");
    expect(args.create.scheduledAt.toISOString()).toBe("2099-01-01T02:00:00.000Z");
  });

  it("refuses a reminder on a completed task with 409", async () => {
    db.task.findFirst.mockResolvedValue({ id: "t1", completed: true });
    const res = await PUT(put({ dueLocal: "2099-01-01T09:00" }), ctx);
    expect(res.status).toBe(409);
    expect(db.reminder.upsert).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/workspaces/[slug]/tasks/[id]/reminder (AC-21)", () => {
  it("returns 401 without a session and deletes nothing", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(401);
    expect(db.reminder.deleteMany).not.toHaveBeenCalled();
  });

  it("removes only the reminder for this task in this workspace", async () => {
    db.reminder.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(db.reminder.deleteMany).toHaveBeenCalledWith({ where: { taskId: "t1", workspaceId: "ws1" } });
  });
});

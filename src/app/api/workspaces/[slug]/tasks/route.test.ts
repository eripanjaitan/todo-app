import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ task: { findMany: vi.fn(), create: vi.fn() } }));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { GET, POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list" }) };
const json = (body: unknown) =>
  new Request("http://localhost/api/workspaces/home-list/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-07T02:00:00.000Z"));
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  db.task.findMany.mockReset();
  db.task.create.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/workspaces/[slug]/tasks (AC-5, AC-30)", () => {
  it("returns 401 without a session and reads nothing", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(401);
    expect(db.task.findMany).not.toHaveBeenCalled();
  });

  it("marks past reminders as due and future ones as not due", async () => {
    db.task.findMany.mockResolvedValue([
      {
        id: "t1", title: "Due", notes: null, completed: false,
        reminder: { id: "r1", dueAt: new Date("2026-11-07T01:00:00.000Z"), repeat: "NONE", dismissed: false },
      },
      {
        id: "t2", title: "Later", notes: null, completed: false,
        reminder: { id: "r2", dueAt: new Date("2026-11-08T01:00:00.000Z"), repeat: "NONE", dismissed: false },
      },
    ]);
    const body = await (await GET(new Request("http://localhost/x"), ctx)).json();
    expect(body.tasks[0].reminder.isDue).toBe(true);
    expect(body.tasks[1].reminder.isDue).toBe(false);
  });
});

describe("POST /api/workspaces/[slug]/tasks (AC-16, AC-19)", () => {
  it("rejects an empty title with 400 and creates nothing", async () => {
    const res = await POST(json({ title: "   " }), ctx);
    expect(res.status).toBe(400);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("creates a task in the session's workspace and returns 201", async () => {
    db.task.create.mockResolvedValue({ id: "t1", title: "Buy milk", notes: null, completed: false });
    const res = await POST(json({ title: "Buy milk" }), ctx);
    expect(res.status).toBe(201);
    expect(db.task.create.mock.calls[0][0].data.workspaceId).toBe("ws1");
  });
});

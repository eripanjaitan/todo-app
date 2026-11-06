import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ reminder: { findFirst: vi.fn(), update: vi.fn() } }));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list", id: "r1" }) };
const req = () => new Request("http://localhost/x", { method: "POST" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-07T02:00:00.000Z"));
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  db.reminder.findFirst.mockReset();
  db.reminder.update.mockReset().mockImplementation(async ({ data }: { data: object }) => ({
    id: "r1",
    dueAt: new Date("2026-11-07T02:00:00.000Z"),
    dismissed: false,
    ...data,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/workspaces/[slug]/reminders/[id]/dismiss (AC-25a, AC-32)", () => {
  it("returns 401 without a session", async () => {
    auth.getWorkspaceSession.mockResolvedValue(null);
    expect((await POST(req(), ctx)).status).toBe(401);
  });

  it("returns 409 for a reminder that is not due yet", async () => {
    db.reminder.findFirst.mockResolvedValue({
      id: "r1", dueAt: new Date("2026-11-08T02:00:00.000Z"), repeat: "NONE", dismissed: false,
    });
    expect((await POST(req(), ctx)).status).toBe(409);
    expect(db.reminder.update).not.toHaveBeenCalled();
  });

  it("dismisses a one-time reminder", async () => {
    db.reminder.findFirst.mockResolvedValue({
      id: "r1", dueAt: new Date("2026-11-07T01:00:00.000Z"), repeat: "NONE", dismissed: false,
    });
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(db.reminder.update.mock.calls[0][0].data).toEqual({ dismissed: true });
  });

  it("moves a daily reminder to its next occurrence instead of dismissing it (AC-25a)", async () => {
    db.reminder.findFirst.mockResolvedValue({
      id: "r1", dueAt: new Date("2026-11-06T02:00:00.000Z"), repeat: "DAILY", dismissed: false,
    });
    await POST(req(), ctx);
    const data = db.reminder.update.mock.calls[0][0].data;
    expect(data.dueAt.toISOString()).toBe("2026-11-08T02:00:00.000Z");
    expect(data.dueMarkedAt).toBeNull();
    expect(data.dismissed).toBeUndefined();
  });
});

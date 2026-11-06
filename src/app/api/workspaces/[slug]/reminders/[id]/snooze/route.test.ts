import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ reminder: { findFirst: vi.fn(), update: vi.fn() } }));
const auth = vi.hoisted(() => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/workspace-auth", () => auth);

import { POST } from "./route";

const ctx = { params: Promise.resolve({ slug: "home-list", id: "r1" }) };
const req = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-07T02:00:00.000Z"));
  auth.getWorkspaceSession.mockReset().mockResolvedValue({ workspaceId: "ws1" });
  db.reminder.findFirst.mockReset().mockResolvedValue({
    id: "r1", dueAt: new Date("2026-11-07T01:00:00.000Z"), dismissed: false,
  });
  db.reminder.update.mockReset().mockImplementation(async ({ data }: { data: { dueAt: Date } }) => ({
    id: "r1",
    dueAt: data.dueAt,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/workspaces/[slug]/reminders/[id]/snooze (AC-33, AC-34)", () => {
  it("rejects an unknown snooze option with 400", async () => {
    expect((await POST(req({ option: "5m" }), ctx)).status).toBe(400);
    expect(db.reminder.update).not.toHaveBeenCalled();
  });

  it("returns 409 when the reminder is not due", async () => {
    db.reminder.findFirst.mockResolvedValue({
      id: "r1", dueAt: new Date("2026-11-08T02:00:00.000Z"), dismissed: false,
    });
    expect((await POST(req({ option: "1h" }), ctx)).status).toBe(409);
  });

  it("snoozes 10 minutes from now and clears the due mark", async () => {
    const res = await POST(req({ option: "10m" }), ctx);
    expect(res.status).toBe(200);
    const data = db.reminder.update.mock.calls[0][0].data;
    expect(data.dueAt.toISOString()).toBe("2026-11-07T02:10:00.000Z");
    expect(data.dueMarkedAt).toBeNull();
  });

  it("snoozes to tomorrow 09:00 Jakarta time", async () => {
    await POST(req({ option: "tomorrow9" }), ctx);
    const data = db.reminder.update.mock.calls[0][0].data;
    expect(data.dueAt.toISOString()).toBe("2026-11-08T02:00:00.000Z");
  });
});

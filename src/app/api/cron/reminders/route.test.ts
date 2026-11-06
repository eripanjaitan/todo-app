import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted keeps the mock defined before vi.mock's factory runs.
const { updateMany } = vi.hoisted(() => ({
  updateMany: vi.fn(async (_args: unknown) => ({ count: 2 })),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { reminder: { updateMany } } }));

import { GET } from "./route";

beforeEach(() => {
  process.env.CRON_SECRET = "cron-test-secret";
  updateMany.mockClear();
});

describe("cron reminders route (AC-26, AC-27, AC-28)", () => {
  it("rejects requests without a valid CRON_SECRET and changes nothing", async () => {
    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects a wrong token", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/reminders", { headers: { authorization: "Bearer nope" } }),
    );
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("marks due, undismissed, unmarked reminders with the valid token", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer cron-test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ marked: 2 });
    const args = updateMany.mock.calls[0][0] as { where: { dueMarkedAt: null; dismissed: false } };
    expect(args.where.dueMarkedAt).toBeNull();
    expect(args.where.dismissed).toBe(false);
  });
});

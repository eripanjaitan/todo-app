import { describe, expect, it } from "vitest";
import {
  RECENT_KEY,
  RECENT_MAX,
  addRecent,
  readRecent,
  removeRecent,
  writeRecent,
  type RecentWorkspace,
} from "./recent-workspaces";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    data,
  };
}

describe("recent workspaces (AC-7 to AC-9)", () => {
  it("puts the newest first, without duplicates, capped at 10", () => {
    let list: RecentWorkspace[] = [];
    for (let i = 0; i < 12; i++) list = addRecent(list, { slug: `ws-${i}`, name: `W${i}` });
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0].slug).toBe("ws-11");

    list = addRecent(list, { slug: "ws-5", name: "W5 renamed" });
    expect(list.filter((r) => r.slug === "ws-5")).toHaveLength(1);
    expect(list[0]).toEqual({ slug: "ws-5", name: "W5 renamed" });
  });

  it("removes one entry", () => {
    const list = removeRecent([{ slug: "a", name: "A" }, { slug: "b", name: "B" }], "a");
    expect(list).toEqual([{ slug: "b", name: "B" }]);
  });

  it("stores only slug and name, never codes or tokens (AC-8)", () => {
    const storage = memoryStorage();
    writeRecent(storage, [{ slug: "home", name: "Home" }]);
    expect(storage.data[RECENT_KEY]).toBe('[{"slug":"home","name":"Home"}]');
  });

  it("ignores corrupt or unexpected stored values", () => {
    expect(readRecent(memoryStorage({ [RECENT_KEY]: "{bad json" }))).toEqual([]);
    expect(readRecent(memoryStorage({ [RECENT_KEY]: '{"not":"an array"}' }))).toEqual([]);
    expect(readRecent(memoryStorage({ [RECENT_KEY]: '[{"slug":1},{"slug":"ok","name":"OK"}]' }))).toEqual([
      { slug: "ok", name: "OK" },
    ]);
  });
});

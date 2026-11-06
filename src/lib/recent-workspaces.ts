// AC-7 to AC-10: device-only list of slugs and display names. Never codes, tokens, or task content.
export const RECENT_KEY = "task-reminder:recent-workspaces";
export const RECENT_MAX = 10;

export interface RecentWorkspace {
  slug: string;
  name: string;
}

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecent(value: unknown): value is RecentWorkspace {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.slug === "string" && typeof v.name === "string";
}

export function readRecent(storage: KeyValueStorage): RecentWorkspace[] {
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecent)
      .map((r) => ({ slug: r.slug, name: r.name }))
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function addRecent(list: RecentWorkspace[], entry: RecentWorkspace): RecentWorkspace[] {
  return [entry, ...list.filter((r) => r.slug !== entry.slug)].slice(0, RECENT_MAX);
}

export function removeRecent(list: RecentWorkspace[], slug: string): RecentWorkspace[] {
  return list.filter((r) => r.slug !== slug);
}

export function writeRecent(storage: KeyValueStorage, list: RecentWorkspace[]): void {
  storage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

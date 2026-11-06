"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Lock, Plus, X } from "lucide-react";
import {
  RECENT_KEY,
  addRecent,
  readRecent,
  removeRecent,
  writeRecent,
  type RecentWorkspace,
} from "@/lib/recent-workspaces";

const RECENT_EVENT = "task-reminder:recent-changed";

// Subscribe to changes in the device list (other tabs, and this tab's own writes).
function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

function getRecentSnapshot() {
  return window.localStorage.getItem(RECENT_KEY) ?? "";
}

function getRecentServerSnapshot() {
  return "";
}

// Which form is shown. "open" is the default.
type Mode = "open" | "create";

const card = "space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const label = "mb-1 block text-sm font-medium text-slate-700";
const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const hint = "mt-1 text-xs text-slate-500";

const switchButton =
  "mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900";

// AC-7 to AC-10 (recent list), AC-1 (create), AC-3 (open)
export function HomeView() {
  const router = useRouter();
  const rawRecent = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentServerSnapshot);
  const recent = useMemo<RecentWorkspace[]>(
    () => readRecent({ getItem: () => rawRecent, setItem: () => {} }),
    [rawRecent],
  );

  const [mode, setMode] = useState<Mode>("open");
  const [openSlug, setOpenSlug] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  const notifyRecent = useCallback(() => {
    window.dispatchEvent(new Event(RECENT_EVENT));
  }, []);

  function remember(entry: RecentWorkspace) {
    writeRecent(window.localStorage, addRecent(readRecent(window.localStorage), entry));
    notifyRecent();
  }

  function forget(slug: string) {
    writeRecent(window.localStorage, removeRecent(readRecent(window.localStorage), slug));
    notifyRecent();
  }

  // Switch between the open and create forms.
  function switchMode() {
    setMode((current) => (current === "open" ? "create" : "open"));
  }

  // A recent chip opens the open form with the slug filled in (the code field autofocuses).
  function pickRecent(slug: string) {
    setOpenSlug(slug);
    setMode("open");
  }

  async function submit(url: string, body: unknown): Promise<RecentWorkspace | null> {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return null;
      }
      return data;
    } catch {
      toast.error("Network error. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const ws = await submit("/api/workspaces", {
      slug: newSlug.trim().toLowerCase(),
      name: newName.trim(),
      accessCode: newCode,
    });
    if (ws) {
      remember(ws);
      router.push(`/w/${ws.slug}`);
    }
  }

  async function onOpen(e: React.FormEvent) {
    e.preventDefault();
    const slug = openSlug.trim().toLowerCase();
    const ws = await submit(`/api/workspaces/${encodeURIComponent(slug)}/unlock`, {
      accessCode: openCode,
    });
    if (ws) {
      remember(ws);
      router.push(`/w/${ws.slug}`);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Task Reminder</h1>
        <p className="text-sm text-slate-600">
          Private to-do lists with reminders in Jakarta time. Each workspace is protected by its own access code.
        </p>
      </header>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="space-y-3">
          <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock size={16} aria-hidden="true" />
            Recent workspaces
          </h2>
          <ul className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <li
                key={r.slug}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-sm shadow-sm"
              >
                <button
                  type="button"
                  className="font-medium text-slate-900 hover:underline"
                  onClick={() => pickRecent(r.slug)}
                  title={`Open /${r.slug}`}
                >
                  {r.name}
                </button>
                <span className="text-slate-400">/{r.slug}</span>
                <button
                  type="button"
                  aria-label={`Remove ${r.slug} from recent list`}
                  className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => forget(r.slug)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="start-heading" className={card}>
        {mode === "open" && (
          <form id="open-panel" onSubmit={onOpen} className="space-y-3">
            <h2 id="start-heading" className="flex items-center gap-2 font-semibold text-slate-900">
              <Lock size={16} aria-hidden="true" />
              Open a workspace
            </h2>
            <p className="text-sm text-slate-500">Enter the slug and access code you were given.</p>
            <div>
              <label htmlFor="open-slug" className={label}>Workspace slug</label>
              <input
                id="open-slug"
                className={input}
                placeholder="home-list"
                autoComplete="off"
                value={openSlug}
                onChange={(e) => setOpenSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="open-code" className={label}>Access code</label>
              <input
                id="open-code"
                type="password"
                className={input}
                autoComplete="current-password"
                autoFocus={openSlug !== ""}
                value={openCode}
                onChange={(e) => setOpenCode(e.target.value)}
                required
              />
            </div>
            <button className={primaryButton} disabled={busy}>Open workspace</button>
          </form>
        )}

        {mode === "create" && (
          <form id="create-panel" onSubmit={onCreate} className="space-y-3">
            <h2 id="start-heading" className="flex items-center gap-2 font-semibold text-slate-900">
              <Plus size={16} aria-hidden="true" />
              Create a workspace
            </h2>
            <p className="text-sm text-slate-500">Start a new private list.</p>
            <div>
              <label htmlFor="new-slug" className={label}>Slug</label>
              <input
                id="new-slug"
                className={input}
                placeholder="home-list"
                autoComplete="off"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                required
              />
              <p className={hint}>Lowercase letters, numbers, and hyphens. 3 to 40 characters.</p>
            </div>
            <div>
              <label htmlFor="new-name" className={label}>Name</label>
              <input
                id="new-name"
                className={input}
                placeholder="Home"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="new-code" className={label}>Access code</label>
              <input
                id="new-code"
                type="password"
                className={input}
                autoComplete="new-password"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
                minLength={8}
              />
              <p className={hint}>At least 8 characters. A lost code cannot be recovered.</p>
            </div>
            <button className={primaryButton} disabled={busy}>Create workspace</button>
          </form>
        )}

        <button
          type="button"
          className={switchButton}
          aria-controls={mode === "open" ? "create-panel" : "open-panel"}
          onClick={switchMode}
        >
          {mode === "open" ? "New here? Create a workspace" : "Already have a workspace? Open it"}
        </button>
      </section>
    </div>
  );
}
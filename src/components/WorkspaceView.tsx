"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bell, Clock, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { formatJakarta } from "@/lib/time";

interface Reminder {
  id: string;
  dueAt: string;
  repeat: "NONE" | "DAILY";
  dismissed: boolean;
  isDue: boolean;
}
interface Task {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  reminder: Reminder | null;
}
type Repeat = "NONE" | "DAILY";
interface Draft {
  local: string;
  repeat: Repeat;
}

const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
const dueCard = "rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm";
const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900";
const primary =
  "inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50";
const linkButton = "text-xs font-medium text-slate-700 hover:underline";
const dangerLink = "text-xs font-medium text-red-600 hover:underline";
const iconDanger = "rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600";
const iconButton = "rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50";
const fieldLabel = "mb-1 block text-xs font-medium text-slate-600";

// Convert a stored UTC time to the "YYYY-MM-DDTHH:mm" wall-clock string Jakarta users see.
function toJakartaInput(iso: string): string {
  const jakarta = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return jakarta.toISOString().slice(0, 16);
}

// AC-23 to AC-35 in the UI. All text is rendered as plain text by React (AC-18).
export function WorkspaceView({ slug }: { slug: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [name, setName] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(true);
  const [title, setTitle] = useState("");
  const [codes, setCodes] = useState({ current: "", next: "" });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);

  const base = `/api/workspaces/${encodeURIComponent(slug)}`;

  // Initial load. The guard stops a late response from updating an unmounted view.
  useEffect(() => {
    let active = true;
    fetch(`${base}/tasks`, { cache: "no-store" }).then(async (res) => {
      if (!active) return;
      if (res.status === 401) {
        setUnlocked(false);
        return;
      }
      const data = await res.json();
      if (!active) return;
      setName(data.name);
      setNow(new Date(data.now));
      setTasks(data.tasks);
    });
    return () => {
      active = false;
    };
  }, [base]);

  // Reload after a change (not from an effect).
  async function reload() {
    const res = await fetch(`${base}/tasks`, { cache: "no-store" });
    if (res.status === 401) {
      setUnlocked(false);
      return;
    }
    const data = await res.json();
    setName(data.name);
    setNow(new Date(data.now));
    setTasks(data.tasks);
  }

  async function call(method: string, url: string, body?: unknown): Promise<boolean> {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Request failed");
      if (res.status === 401) setUnlocked(false);
      return false;
    }
    await reload();
    return true;
  }

  function openEditor(task: Task) {
    setDrafts((d) => ({
      ...d,
      [task.id]: {
        local: task.reminder && !task.reminder.dismissed ? toJakartaInput(task.reminder.dueAt) : "",
        repeat: task.reminder?.repeat ?? "NONE",
      },
    }));
    setEditingId(task.id);
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => ({
      ...d,
      [id]: { local: d[id]?.local ?? "", repeat: d[id]?.repeat ?? "NONE", ...patch },
    }));
  }

  async function saveReminder(task: Task) {
    const draft = drafts[task.id];
    if (!draft?.local) return;
    const ok = await call("PUT", `${base}/tasks/${task.id}/reminder`, {
      dueLocal: draft.local,
      repeat: draft.repeat,
    });
    if (ok) setEditingId(null);
  }

  function openSettings() {
    settingsRef.current?.showModal();
  }

  function closeSettings() {
    settingsRef.current?.close();
  }

  if (!unlocked) {
    return (
      <div className={`${card} space-y-3`}>
        <p className="text-slate-700">This workspace is not unlocked on this device.</p>
        <Link href="/" className="text-sm font-medium text-slate-900 underline">
          Go to home to open it
        </Link>
      </div>
    );
  }
  if (tasks === null) return <p className="text-sm text-slate-500">Loading...</p>;

  // AC-23, AC-30: reminders that are due and not dismissed.
  const due = tasks.flatMap((t) =>
    t.reminder && t.reminder.isDue && !t.reminder.dismissed ? [{ task: t, reminder: t.reminder }] : [],
  );
  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{name ?? slug}</h1>
          <p className="text-sm text-slate-500">/{slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:underline">
            <ArrowLeft size={16} aria-hidden="true" />
            Home
          </Link>
          <button type="button" className={iconButton} aria-label="Access and security" title="Access and security" onClick={openSettings}>
            <ShieldCheck size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* AC-23, AC-30: in-app due panel */}
      {due.length > 0 && (
        <section aria-labelledby="due-heading" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 id="due-heading" className="flex items-center gap-2 font-semibold text-amber-900">
            <Bell size={16} aria-hidden="true" />
            Due now
          </h2>
          <ul className="space-y-3">
            {due.map(({ task, reminder }) => (
              <li key={task.id} className="rounded-lg bg-white p-3">
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-xs text-slate-500">{formatJakarta(new Date(reminder.dueAt))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className={secondary} onClick={() => call("POST", `${base}/reminders/${reminder.id}/snooze`, { option: "10m" })}>
                    +10 min
                  </button>
                  <button className={secondary} onClick={() => call("POST", `${base}/reminders/${reminder.id}/snooze`, { option: "1h" })}>
                    +1 hour
                  </button>
                  <button className={secondary} onClick={() => call("POST", `${base}/reminders/${reminder.id}/snooze`, { option: "tomorrow9" })}>
                    Tomorrow 09:00
                  </button>
                  <button className={primary} onClick={() => call("POST", `${base}/reminders/${reminder.id}/dismiss`)}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="add-heading" className={card}>
        <h2 id="add-heading" className="sr-only">Add a task</h2>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("POST", `${base}/tasks`, { title })) setTitle("");
          }}
        >
          <label htmlFor="new-task" className="sr-only">New task</label>
          <input
            id="new-task"
            className={`${input} flex-1`}
            placeholder="Add a task"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <button className={primary}>
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </form>
      </section>

      <section aria-labelledby="tasks-heading" className="space-y-3">
        <h2 id="tasks-heading" className="text-sm font-semibold text-slate-700">
          Tasks <span className="font-normal text-slate-500">({openCount} open)</span>
        </h2>

        {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet. Add one above.</p>}

        <ul className="space-y-3">
          {tasks.map((t) => {
            const active = t.reminder && !t.reminder.dismissed ? t.reminder : null;
            const draft = drafts[t.id];
            return (
              <li key={t.id} className={active?.isDue ? dueCard : card}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    aria-label={`Mark "${t.title}" as ${t.completed ? "not done" : "done"}`}
                    checked={t.completed}
                    onChange={() => call("PATCH", `${base}/tasks/${t.id}`, { completed: !t.completed })}
                  />

                  <div className="min-w-0 flex-1">
                    <p className={t.completed ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
                      {t.title}
                    </p>
                    {t.notes && <p className="mt-0.5 text-sm text-slate-500">{t.notes}</p>}

                    {active && editingId !== t.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <Clock size={14} aria-hidden="true" />
                        <span>{formatJakarta(new Date(active.dueAt))}</span>
                        {active.isDue && (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 font-semibold text-amber-900">Due</span>
                        )}
                        {active.repeat === "DAILY" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Daily</span>
                        )}
                        {!t.completed && (
                          <button className={linkButton} onClick={() => openEditor(t)}>Edit</button>
                        )}
                        <button className={dangerLink} onClick={() => call("DELETE", `${base}/tasks/${t.id}/reminder`)}>
                          Remove reminder
                        </button>
                      </div>
                    )}

                    {!active && !t.completed && editingId !== t.id && (
                      <button className={`${linkButton} mt-2`} onClick={() => openEditor(t)}>
                        + Add reminder
                      </button>
                    )}

                    {editingId === t.id && draft && (
                      <form
                        className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveReminder(t);
                        }}
                      >
                        <div>
                          <label htmlFor={`due-${t.id}`} className={fieldLabel}>Date and time (Jakarta)</label>
                          <input
                            id={`due-${t.id}`}
                            type="datetime-local"
                            className={input}
                            value={draft.local}
                            onChange={(e) => updateDraft(t.id, { local: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor={`repeat-${t.id}`} className={fieldLabel}>Repeat</label>
                          <select
                            id={`repeat-${t.id}`}
                            className={input}
                            value={draft.repeat}
                            onChange={(e) => updateDraft(t.id, { repeat: e.target.value as Repeat })}
                          >
                            <option value="NONE">Once</option>
                            <option value="DAILY">Daily</option>
                          </select>
                        </div>
                        <button className={primary}>Save</button>
                        <button type="button" className={secondary} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>

                  <button
                    type="button"
                    className={iconDanger}
                    aria-label={`Delete task "${t.title}"`}
                    onClick={() => call("DELETE", `${base}/tasks/${t.id}`)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Access and security: opened from the shield icon in the header. */}
      <dialog
        ref={settingsRef}
        aria-labelledby="settings-heading"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 id="settings-heading" className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck size={18} aria-hidden="true" />
              Access and security
            </h2>
            <button type="button" className={iconDanger} aria-label="Close" onClick={closeSettings}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">Sign out every other device that has opened this workspace.</p>
            <button className={secondary} onClick={() => call("POST", `${base}/sign-out-others`)}>
              Sign out other devices
            </button>
          </div>

          <form
            className="space-y-3 border-t border-slate-200 pt-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await call("POST", `${base}/access-code`, { currentCode: codes.current, newCode: codes.next })) {
                toast.success("Access code changed");
                setCodes({ current: "", next: "" });
              }
            }}
          >
            <p className="text-sm text-slate-600">Changing the code signs out other devices.</p>
            <div>
              <label htmlFor="current-code" className={fieldLabel}>Current access code</label>
              <input
                id="current-code"
                type="password"
                className={input}
                autoComplete="current-password"
                value={codes.current}
                onChange={(e) => setCodes({ ...codes, current: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="next-code" className={fieldLabel}>New access code (min 8)</label>
              <input
                id="next-code"
                type="password"
                className={input}
                autoComplete="new-password"
                minLength={8}
                value={codes.next}
                onChange={(e) => setCodes({ ...codes, next: e.target.value })}
                required
              />
            </div>
            <button className={primary}>Change code</button>
          </form>
        </div>
      </dialog>

      <p className="text-xs text-slate-400">All times are Asia/Jakarta (WIB). Current time: {formatJakarta(now)}</p>
    </div>
  );
}

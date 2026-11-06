"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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

// AC-23 to AC-35 in the UI. All text is rendered as plain text by React (AC-18).
export function WorkspaceView({ slug }: { slug: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [unlocked, setUnlocked] = useState(true);
  const [title, setTitle] = useState("");
  const [codes, setCodes] = useState({ current: "", next: "" });
  const [reminderDraft, setReminderDraft] = useState<Record<string, { local: string; repeat: "NONE" | "DAILY" }>>({});

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

  if (!unlocked) {
    return (
      <div className="space-y-3">
        <p>This workspace is not unlocked on this device.</p>
        <Link href="/" className="underline">Go to home to open it</Link>
      </div>
    );
  }
  if (tasks === null) return <p className="text-sm text-slate-500">Loading...</p>;

  const dueReminders = tasks.filter((t) => t.reminder?.isDue && t.reminder && !t.reminder.dismissed);
  const input = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";
  const button = "rounded-md bg-slate-900 px-3 py-1 text-sm text-white";
  const ghost = "rounded-md border border-slate-300 px-3 py-1 text-sm";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">/{slug}</h1>
        <Link href="/" className="text-sm underline">Home</Link>
      </header>

      {/* AC-23, AC-30: in-app due panel */}
      {dueReminders.length > 0 && (
        <section className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          <h2 className="font-medium">Due reminders</h2>
          {dueReminders.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {t.title}{" "}
                <span className="text-slate-500">({formatJakarta(new Date(t.reminder!.dueAt))})</span>
              </span>
              <span className="flex gap-2">
                <button className={ghost} onClick={() => call("POST", `${base}/reminders/${t.reminder!.id}/snooze`, { option: "10m" })}>+10m</button>
                <button className={ghost} onClick={() => call("POST", `${base}/reminders/${t.reminder!.id}/snooze`, { option: "1h" })}>+1h</button>
                <button className={ghost} onClick={() => call("POST", `${base}/reminders/${t.reminder!.id}/snooze`, { option: "tomorrow9" })}>Tomorrow 09:00</button>
                <button className={button} onClick={() => call("POST", `${base}/reminders/${t.reminder!.id}/dismiss`)}>Dismiss</button>
              </span>
            </div>
          ))}
        </section>
      )}

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await call("POST", `${base}/tasks`, { title })) setTitle("");
        }}
      >
        <input className={`${input} flex-1`} placeholder="New task" value={title} maxLength={200}
          onChange={(e) => setTitle(e.target.value)} required />
        <button className={button}>Add</button>
      </form>

      <ul className="space-y-2">
        {tasks.map((t) => {
          const draft = reminderDraft[t.id] ?? { local: "", repeat: "NONE" as const };
          return (
            <li key={t.id} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={t.completed}
                  onChange={() => call("PATCH", `${base}/tasks/${t.id}`, { completed: !t.completed })} />
                <span className={`flex-1 ${t.completed ? "text-slate-400 line-through" : ""}`}>{t.title}</span>
                <button className="text-xs text-red-600" onClick={() => call("DELETE", `${base}/tasks/${t.id}`)}>Delete</button>
              </div>

              {t.reminder && !t.reminder.dismissed && (
                <p className="text-xs text-slate-500">
                  Reminder: {formatJakarta(new Date(t.reminder.dueAt))}
                  {t.reminder.repeat === "DAILY" ? " (daily)" : ""}
                  <button className="ml-2 underline" onClick={() => call("DELETE", `${base}/tasks/${t.id}/reminder`)}>Remove</button>
                </p>
              )}

              {!t.completed && (
                <form
                  className="flex flex-wrap gap-2 text-sm"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.local) return;
                    await call("PUT", `${base}/tasks/${t.id}/reminder`, { dueLocal: draft.local, repeat: draft.repeat });
                    setReminderDraft((d) => ({ ...d, [t.id]: { local: "", repeat: "NONE" } }));
                  }}
                >
                  {/* Wall-clock input: the value is sent as typed and read as Asia/Jakarta on the server. */}
                  <input className={input} type="datetime-local" aria-label="Reminder time (Jakarta)"
                    value={draft.local}
                    onChange={(e) => setReminderDraft((d) => ({ ...d, [t.id]: { ...draft, local: e.target.value } }))} />
                  <select className={input} value={draft.repeat}
                    onChange={(e) => setReminderDraft((d) => ({ ...d, [t.id]: { ...draft, repeat: e.target.value as "NONE" | "DAILY" } }))}>
                    <option value="NONE">Once</option>
                    <option value="DAILY">Daily</option>
                  </select>
                  <button className={ghost}>Set reminder (Jakarta time)</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <section className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <h2 className="font-medium">Access</h2>
        <button className={ghost} onClick={() => call("POST", `${base}/sign-out-others`)}>
          Sign out other devices
        </button>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("POST", `${base}/access-code`, { currentCode: codes.current, newCode: codes.next })) {
              toast.success("Access code changed");
              setCodes({ current: "", next: "" });
            }
          }}
        >
          <input className={input} type="password" placeholder="Current code" value={codes.current}
            onChange={(e) => setCodes({ ...codes, current: e.target.value })} required />
          <input className={input} type="password" placeholder="New code (min 8)" value={codes.next} minLength={8}
            onChange={(e) => setCodes({ ...codes, next: e.target.value })} required />
          <button className={ghost}>Change code</button>
        </form>
      </section>

      <p className="text-xs text-slate-400">Times shown in Asia/Jakarta (WIB). Current time: {formatJakarta(now)}</p>
    </div>
  );
}

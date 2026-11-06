"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  addRecent,
  readRecent,
  removeRecent,
  writeRecent,
  type RecentWorkspace,
} from "@/lib/recent-workspaces";

// AC-7 to AC-10 (recent list), AC-1 (create), AC-3 (open)
export function HomeView() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [openSlug, setOpenSlug] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRecent(readRecent(window.localStorage));
  }, []);

  function remember(entry: RecentWorkspace) {
    const next = addRecent(readRecent(window.localStorage), entry);
    writeRecent(window.localStorage, next);
    setRecent(next);
  }

  function forget(slug: string) {
    const next = removeRecent(readRecent(window.localStorage), slug);
    writeRecent(window.localStorage, next);
    setRecent(next);
  }

  async function submit(url: string, body: unknown): Promise<{ slug: string; name: string } | null> {
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

  const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
  const button =
    "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Task Reminder</h1>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Recent workspaces</h2>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.slug} className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
                <button
                  type="button"
                  className="text-left text-sm"
                  onClick={() => setOpenSlug(r.slug)}
                >
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="text-slate-500">/{r.slug}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${r.slug} from recent list`}
                  className="text-slate-400 hover:text-slate-700"
                  onClick={() => forget(r.slug)}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <h2 className="font-medium">Open a workspace</h2>
        <form onSubmit={onOpen} className="space-y-2">
          <input className={input} placeholder="Workspace slug" value={openSlug}
            onChange={(e) => setOpenSlug(e.target.value)} required />
          <input className={input} type="password" placeholder="Access code" value={openCode}
            onChange={(e) => setOpenCode(e.target.value)} required />
          <button className={button} disabled={busy}>Open</button>
        </form>
      </section>

      <section className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <h2 className="font-medium">Create a workspace</h2>
        <form onSubmit={onCreate} className="space-y-2">
          <input className={input} placeholder="Slug (lowercase, digits, hyphens)" value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)} required />
          <input className={input} placeholder="Name" value={newName}
            onChange={(e) => setNewName(e.target.value)} required />
          <input className={input} type="password" placeholder="Access code (min 8 characters)" value={newCode}
            onChange={(e) => setNewCode(e.target.value)} required minLength={8} />
          <button className={button} disabled={busy}>Create</button>
        </form>
        <p className="text-xs text-slate-500">
          Lost access codes cannot be recovered. <Link href="/" className="underline">Home</Link>
        </p>
      </section>
    </div>
  );
}

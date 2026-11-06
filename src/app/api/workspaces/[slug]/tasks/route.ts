import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/http";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { isDueAt } from "@/lib/reminders";
import { createTaskSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string }> };

// AC-5: every read and write checks the workspace session first.
export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const now = new Date();
  const [workspace, tasks] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: session.workspaceId }, select: { name: true } }),
    prisma.task.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "asc" },
      include: { reminder: true },
    }),
  ]);

  return NextResponse.json({
    name: workspace?.name ?? slug,
    now: now.toISOString(),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      completed: t.completed,
      reminder: t.reminder
        ? {
            id: t.reminder.id,
            dueAt: t.reminder.dueAt.toISOString(),
            repeat: t.reminder.repeat,
            dismissed: t.reminder.dismissed,
            isDue: !t.reminder.dismissed && isDueAt(t.reminder.dueAt, now),
          }
        : null,
    })),
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const body = await parseBody(req, createTaskSchema);
  if (!body.ok) return body.response;

  const task = await prisma.task.create({
    data: {
      workspaceId: session.workspaceId,
      title: body.data.title,
      notes: body.data.notes ?? null,
    },
    select: { id: true, title: true, notes: true, completed: true },
  });
  return NextResponse.json({ ...task, reminder: null }, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/http";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { updateTaskSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const body = await parseBody(req, updateTaskSchema);
  if (!body.ok) return body.response;

  const task = await prisma.task.findFirst({
    where: { id, workspaceId: session.workspaceId },
    select: { id: true, completed: true },
  });
  if (!task) return jsonError(404, "Task not found");

  const { title, notes, completed } = body.data;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (notes !== undefined) data.notes = notes;

  const becomingComplete = completed === true && !task.completed;
  if (completed !== undefined) {
    data.completed = completed;
    data.completedAt = completed ? new Date() : null;
  }

  // AC-24: completing a task cancels its reminder in the same transaction.
  const update = prisma.task.update({
    where: { id },
    data,
    select: { id: true, title: true, notes: true, completed: true },
  });
  let updated;
  if (becomingComplete) {
    // $transaction returns one result per operation; the task is the second.
    const results = await prisma.$transaction([
      prisma.reminder.deleteMany({ where: { taskId: id, workspaceId: session.workspaceId } }),
      update,
    ]);
    updated = results[1];
  } else {
    updated = await update;
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const result = await prisma.task.deleteMany({
    where: { id, workspaceId: session.workspaceId },
  });
  if (result.count === 0) return jsonError(404, "Task not found");
  return NextResponse.json({ ok: true });
}

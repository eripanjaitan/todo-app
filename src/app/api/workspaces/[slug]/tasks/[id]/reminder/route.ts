import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/http";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { isInPast, jakartaLocalToUtc } from "@/lib/time";
import { setReminderSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string; id: string }> };

// AC-20 to AC-23: set or change a task's single reminder.
export async function PUT(req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const body = await parseBody(req, setReminderSchema);
  if (!body.ok) return body.response;

  const dueAt = jakartaLocalToUtc(body.data.dueLocal);
  if (!dueAt) return jsonError(400, "Invalid date or time");
  if (isInPast(dueAt, new Date())) {
    return jsonError(400, "Reminder time is in the past (Asia/Jakarta)");
  }

  const task = await prisma.task.findFirst({
    where: { id, workspaceId: session.workspaceId },
    select: { id: true, completed: true },
  });
  if (!task) return jsonError(404, "Task not found");
  if (task.completed) return jsonError(409, "Completed tasks cannot have reminders");

  const reminder = await prisma.reminder.upsert({
    where: { taskId: id },
    create: {
      workspaceId: session.workspaceId,
      taskId: id,
      dueAt,
      repeat: body.data.repeat,
    },
    update: {
      dueAt,
      repeat: body.data.repeat,
      dismissed: false,
      dueMarkedAt: null,
    },
    select: { id: true, dueAt: true, repeat: true, dismissed: true },
  });
  return NextResponse.json({ ...reminder, dueAt: reminder.dueAt.toISOString() });
}

// AC-21: remove a reminder.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  await prisma.reminder.deleteMany({
    where: { taskId: id, workspaceId: session.workspaceId },
  });
  return NextResponse.json({ ok: true });
}

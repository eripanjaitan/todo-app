import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { advanceDaily, isDueAt, isRepeating } from "@/lib/reminders";

type Ctx = { params: Promise<{ slug: string; id: string }> };

// AC-32, AC-25a: dismiss a due reminder. A daily repeat moves to its next occurrence.
export async function POST(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const reminder = await prisma.reminder.findFirst({
    where: { id, workspaceId: session.workspaceId },
  });
  if (!reminder) return jsonError(404, "Reminder not found");

  const now = new Date();
  if (!isDueAt(reminder.dueAt, now)) return jsonError(409, "Reminder is not due yet");

  const updated = isRepeating(reminder.repeat)
    ? await prisma.reminder.update({
        where: { id },
        data: { dueAt: advanceDaily(reminder.dueAt, now), dueMarkedAt: null },
      })
    : await prisma.reminder.update({
        where: { id },
        data: { dismissed: true },
      });

  return NextResponse.json({
    id: updated.id,
    dueAt: updated.dueAt.toISOString(),
    dismissed: updated.dismissed,
  });
}

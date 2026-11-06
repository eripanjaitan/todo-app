import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/http";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { isDueAt } from "@/lib/reminders";
import { snoozeTarget } from "@/lib/time";
import { snoozeSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string; id: string }> };

// AC-33, AC-34: snooze a due reminder to 10 minutes, 1 hour, or tomorrow 09:00 Jakarta.
export async function POST(req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const body = await parseBody(req, snoozeSchema);
  if (!body.ok) return body.response;

  const reminder = await prisma.reminder.findFirst({
    where: { id, workspaceId: session.workspaceId },
  });
  if (!reminder) return jsonError(404, "Reminder not found");

  const now = new Date();
  if (reminder.dismissed || !isDueAt(reminder.dueAt, now)) {
    return jsonError(409, "Only a due reminder can be snoozed");
  }

  const updated = await prisma.reminder.update({
    where: { id },
    data: { dueAt: snoozeTarget(body.data.option, now), dueMarkedAt: null },
  });
  return NextResponse.json({ id: updated.id, dueAt: updated.dueAt.toISOString() });
}

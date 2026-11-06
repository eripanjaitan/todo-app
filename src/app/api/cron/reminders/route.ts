import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { jsonError } from "@/lib/http";

// AC-26 to AC-28: mark every reminder whose time has passed as due. Idempotent:
// a reminder already marked (dueMarkedAt set) is not touched again.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    return jsonError(401, "Unauthorized");
  }

  const now = new Date();
  const result = await prisma.reminder.updateMany({
    where: { dismissed: false, dueAt: { lte: now }, dueMarkedAt: null },
    data: { dueMarkedAt: now },
  });
  return NextResponse.json({ marked: result.count });
}

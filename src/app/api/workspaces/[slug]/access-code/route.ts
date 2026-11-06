import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode, verifyAccessCode } from "@/lib/password";
import { clientIp, jsonError, parseBody } from "@/lib/http";
import { allowUnlockAttempt, recordFailedUnlock } from "@/lib/rate-limit";
import { getWorkspaceSession } from "@/lib/workspace-auth";
import { changeCodeSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string }> };

// AC-6: changing the code requires the current code. Rate limited like unlock (AC-14).
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  if (!(await allowUnlockAttempt(`code:${slug}:${clientIp(req)}`))) {
    return jsonError(429, "Too many attempts. Try again later.");
  }

  const body = await parseBody(req, changeCodeSchema);
  if (!body.ok) return body.response;

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
    select: { codeHash: true },
  });
  if (!workspace) return jsonError(404, "Workspace not found");

  const valid = await verifyAccessCode(body.data.currentCode, workspace.codeHash);
  if (!valid) {
    await recordFailedUnlock(slug);
    return jsonError(401, "Current access code is incorrect");
  }

  await prisma.workspace.update({
    where: { id: session.workspaceId },
    data: { codeHash: await hashAccessCode(body.data.newCode) },
  });
  return NextResponse.json({ ok: true });
}

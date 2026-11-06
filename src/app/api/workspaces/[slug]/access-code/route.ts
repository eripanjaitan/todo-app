import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode, verifyAccessCode } from "@/lib/password";
import { clientIp, jsonError, parseBody } from "@/lib/http";
import {
  LOCKED_MESSAGE,
  allowUnlockAttempt,
  clearFailedUnlocks,
  isWorkspaceLocked,
  recordFailedUnlock,
} from "@/lib/rate-limit";
import { getWorkspaceSession, setWorkspaceCookie } from "@/lib/workspace-auth";
import { changeCodeSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string }> };

// AC-6: changing the code requires the current code. Shares the lock with unlock (AC-42).
// AC-44: a changed code signs out every other device (session version bump).
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  if (!(await allowUnlockAttempt(`code:${slug}:${clientIp(req)}`))) {
    return jsonError(429, "Too many attempts. Try again later.");
  }

  const body = await parseBody(req, changeCodeSchema);
  if (!body.ok) return body.response;

  if (await isWorkspaceLocked(slug)) return jsonError(429, LOCKED_MESSAGE);

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
    select: { codeHash: true },
  });
  if (!workspace) return jsonError(404, "Workspace not found");

  const valid = await verifyAccessCode(body.data.currentCode, workspace.codeHash);
  if (!valid) {
    const { locked } = await recordFailedUnlock(slug);
    return locked
      ? jsonError(429, LOCKED_MESSAGE)
      : jsonError(401, "Current access code is incorrect");
  }

  const updated = await prisma.workspace.update({
    where: { id: session.workspaceId },
    data: {
      codeHash: await hashAccessCode(body.data.newCode),
      sessionVersion: { increment: 1 },
    },
    select: { sessionVersion: true },
  });
  await clearFailedUnlocks(slug);
  // Re-issue this device's cookie with the new version so this device stays signed in.
  await setWorkspaceCookie(slug, updated.sessionVersion);
  return NextResponse.json({ ok: true });
}

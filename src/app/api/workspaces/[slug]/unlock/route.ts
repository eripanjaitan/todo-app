import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessCode } from "@/lib/password";
import { clientIp, jsonError, parseBody } from "@/lib/http";
import {
  LOCKED_MESSAGE,
  allowUnlockAttempt,
  clearFailedUnlocks,
  isWorkspaceLocked,
  recordFailedUnlock,
} from "@/lib/rate-limit";
import { setWorkspaceCookie } from "@/lib/workspace-auth";
import { unlockSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string }> };

const GENERIC_ERROR = "Invalid workspace or access code";

// AC-3, AC-4, AC-14, AC-15, AC-42
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;

  if (!(await allowUnlockAttempt(`${slug}:${clientIp(req)}`))) {
    return jsonError(429, "Too many attempts. Try again later.");
  }

  const body = await parseBody(req, unlockSchema);
  if (!body.ok) return body.response;

  // AC-42: a locked workspace refuses every attempt until the lock expires.
  if (await isWorkspaceLocked(slug)) return jsonError(429, LOCKED_MESSAGE);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true, codeHash: true, sessionVersion: true },
  });
  // Same generic message whether the slug or the code is wrong (AC-4).
  if (!workspace) return jsonError(401, GENERIC_ERROR);

  const valid = await verifyAccessCode(body.data.accessCode, workspace.codeHash);
  if (!valid) {
    const { locked } = await recordFailedUnlock(slug);
    return locked ? jsonError(429, LOCKED_MESSAGE) : jsonError(401, GENERIC_ERROR);
  }

  await clearFailedUnlocks(slug);
  await setWorkspaceCookie(slug, workspace.sessionVersion);
  return NextResponse.json({ slug, name: workspace.name });
}

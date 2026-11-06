import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessCode } from "@/lib/password";
import { clientIp, jsonError, parseBody } from "@/lib/http";
import { allowUnlockAttempt, recordFailedUnlock } from "@/lib/rate-limit";
import { setWorkspaceCookie } from "@/lib/workspace-auth";
import { unlockSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ slug: string }> };

// AC-3, AC-4, AC-14, AC-15
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;

  if (!(await allowUnlockAttempt(`${slug}:${clientIp(req)}`))) {
    return jsonError(429, "Too many attempts. Try again later.");
  }

  const body = await parseBody(req, unlockSchema);
  if (!body.ok) return body.response;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true, codeHash: true, sessionVersion: true },
  });

  // Same generic message whether the slug or the code is wrong (AC-4).
  const generic = () => jsonError(401, "Invalid workspace or access code");
  if (!workspace) return generic();

  const valid = await verifyAccessCode(body.data.accessCode, workspace.codeHash);
  if (!valid) {
    await recordFailedUnlock(slug);
    return generic();
  }

  await setWorkspaceCookie(slug, workspace.sessionVersion);
  return NextResponse.json({ slug, name: workspace.name });
}

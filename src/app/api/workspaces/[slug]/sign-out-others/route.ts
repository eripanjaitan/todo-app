import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { getWorkspaceSession, setWorkspaceCookie } from "@/lib/workspace-auth";

type Ctx = { params: Promise<{ slug: string }> };

// AC-13: bump the session version (revokes other devices, AC-12) and re-issue this device's cookie.
export async function POST(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const session = await getWorkspaceSession(slug);
  if (!session) return jsonError(401, "Not unlocked");

  const workspace = await prisma.workspace.update({
    where: { id: session.workspaceId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await setWorkspaceCookie(slug, workspace.sessionVersion);
  return NextResponse.json({ ok: true });
}

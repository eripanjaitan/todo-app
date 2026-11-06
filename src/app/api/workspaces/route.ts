import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode } from "@/lib/password";
import { jsonError, parseBody } from "@/lib/http";
import { setWorkspaceCookie } from "@/lib/workspace-auth";
import { createWorkspaceSchema } from "@/lib/validation";

// AC-1: create a workspace with a unique slug and an access code of at least 8 characters.
export async function POST(req: Request) {
  const body = await parseBody(req, createWorkspaceSchema);
  if (!body.ok) return body.response;
  const { slug, name, accessCode } = body.data;

  const existing = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return jsonError(409, "That workspace slug is already taken");

  try {
    const workspace = await prisma.workspace.create({
      data: { slug, name, codeHash: await hashAccessCode(accessCode) },
      select: { slug: true, name: true, sessionVersion: true },
    });
    await setWorkspaceCookie(workspace.slug, workspace.sessionVersion);
    return NextResponse.json({ slug: workspace.slug, name: workspace.name }, { status: 201 });
  } catch {
    // Unique-constraint race between the check above and the insert.
    return jsonError(409, "That workspace slug is already taken");
  }
}

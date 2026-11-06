import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { cookieName, signSession, verifySession } from "./session";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * AC-5 and AC-12: a request is authorized for a workspace only if its cookie is
 * valid, names this slug, and carries the workspace's current session version.
 */
export async function getWorkspaceSession(slug: string): Promise<{ workspaceId: string } | null> {
  const jar = await cookies();
  const token = jar.get(cookieName(slug))?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload || payload.slug !== slug) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, sessionVersion: true },
  });
  if (!workspace || workspace.sessionVersion !== payload.sv) return null;
  return { workspaceId: workspace.id };
}

export async function setWorkspaceCookie(slug: string, sessionVersion: number): Promise<void> {
  const token = await signSession({ slug, sv: sessionVersion });
  const jar = await cookies();
  jar.set(cookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse and validate a JSON body with Zod (AC-19). */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: jsonError(400, "Request body must be JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return { ok: false, response: jsonError(400, message) };
  }
  return { ok: true, data: parsed.data };
}

// m1: x-forwarded-for's first entry is client-supplied, so it is not trusted.
// Vercel sets x-real-ip; otherwise use the last forwarded entry, which the proxy appends.
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return forwarded[forwarded.length - 1] ?? "unknown";
}

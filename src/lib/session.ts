import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const TTL = "30d";

export interface SessionPayload {
  slug: string;
  /** Workspace session version at issue time (AC-12). */
  sv: number;
}

// AC-11: the key comes only from the environment, and the code path refuses to run without it.
function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function cookieName(slug: string): string {
  return `tr_session_${slug}`;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ slug: payload.slug, sv: payload.sv })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(signingKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });
    if (typeof payload.slug === "string" && typeof payload.sv === "number") {
      return { slug: payload.slug, sv: payload.sv };
    }
    return null;
  } catch {
    return null;
  }
}

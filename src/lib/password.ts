import bcrypt from "bcryptjs";

const COST = 12;

// AC-2: only the hash is ever stored.
export function hashAccessCode(code: string): Promise<string> {
  return bcrypt.hash(code, COST);
}

export function verifyAccessCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

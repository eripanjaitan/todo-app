import { timingSafeEqual } from "node:crypto";

// AC-27: reject any request without the exact Bearer CRON_SECRET.
export function isAuthorizedCron(
  authorizationHeader: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret || !authorizationHeader) return false;
  const a = Buffer.from(authorizationHeader);
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

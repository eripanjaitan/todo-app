import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// AC-42: lock after 5 failed unlocks within 15 minutes, for 15 minutes.
const MAX_FAILURES = 5;
const LOCK_SECONDS = 15 * 60;
export const LOCKED_MESSAGE = "Too many failed attempts. Try again in 15 minutes.";

let redis: Redis | null = null;
let unlockLimiter: Ratelimit | null = null;
let createLimiter: Ratelimit | null = null;

// Created lazily so the module can load in tests and builds without Upstash configured.
function getRedis(): Redis {
  redis ??= Redis.fromEnv();
  return redis;
}

const failKey = (slug: string) => `fail:unlock:${slug}`;
const lockKey = (slug: string) => `lock:unlock:${slug}`;

/** AC-14: returns false when the key has exceeded 5 attempts in 15 minutes. */
export async function allowUnlockAttempt(key: string): Promise<boolean> {
  unlockLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:unlock",
  });
  const result = await unlockLimiter.limit(key);
  return result.success;
}

/** AC-43: returns false when an IP has created 10 or more workspaces in the last hour. */
export async function allowCreateAttempt(ip: string): Promise<boolean> {
  createLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:create",
  });
  const result = await createLimiter.limit(ip);
  return result.success;
}

/** AC-42: true while the workspace is locked. */
export async function isWorkspaceLocked(slug: string): Promise<boolean> {
  return (await getRedis().exists(lockKey(slug))) === 1;
}

/**
 * AC-15, AC-42: count a failed attempt. The count lasts 15 minutes from the first
 * failure. At MAX_FAILURES the workspace locks for LOCK_SECONDS. The count is not
 * returned to clients.
 */
export async function recordFailedUnlock(slug: string): Promise<{ locked: boolean }> {
  const client = getRedis();
  const count = await client.incr(failKey(slug));
  if (count === 1) await client.expire(failKey(slug), LOCK_SECONDS);
  if (count >= MAX_FAILURES) {
    await client.set(lockKey(slug), "1", { ex: LOCK_SECONDS });
    await client.del(failKey(slug));
    return { locked: true };
  }
  return { locked: false };
}

/** AC-42: a successful unlock resets the failure count. */
export async function clearFailedUnlocks(slug: string): Promise<void> {
  await getRedis().del(failKey(slug));
}

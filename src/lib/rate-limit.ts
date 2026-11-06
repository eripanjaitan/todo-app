import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis: Redis | null = null;
let unlockLimiter: Ratelimit | null = null;

// Created lazily so the module can load in tests and builds without Upstash configured.
function getRedis(): Redis {
  redis ??= Redis.fromEnv();
  return redis;
}

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

/** AC-15: count failed unlock attempts per workspace. Result is never returned to clients. */
export async function recordFailedUnlock(slug: string): Promise<number> {
  const client = getRedis();
  const key = `fail:unlock:${slug}`;
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 60 * 60 * 24);
  return count;
}

import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Fast in-memory cache layer to reduce database load on Vercel Free Plan
const memoryCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Distributed rate limiter with in-memory caching and Turso database persistence.
 * Tracks IP + User ID sliding windows across Serverless instances.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const now = Date.now();
  const resetAtMs = now + config.windowSeconds * 1000;

  // 1. Fast in-memory check
  const mem = memoryCache.get(key);
  if (mem && mem.resetAt > now) {
    if (mem.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.ceil((mem.resetAt - now) / 1000),
      };
    }
    mem.count++;
  } else {
    memoryCache.set(key, { count: 1, resetAt: resetAtMs });
  }

  // 2. Persist / synchronize with Turso database
  try {
    const resetDate = new Date(resetAtMs);
    const existing = await db
      .select()
      .from(rateLimitEvents)
      .where(and(eq(rateLimitEvents.key, key), gt(rateLimitEvents.resetAt, new Date(now))))
      .limit(1);

    if (existing.length === 0) {
      await db
        .insert(rateLimitEvents)
        .values({ key, count: 1, resetAt: resetDate })
        .onConflictDoUpdate({
          target: rateLimitEvents.key,
          set: { count: 1, resetAt: resetDate },
        });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetInSeconds: config.windowSeconds,
      };
    }

    const currentCount = existing[0].count;
    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.max(1, Math.ceil((existing[0].resetAt.getTime() - now) / 1000)),
      };
    }

    await db
      .update(rateLimitEvents)
      .set({ count: sql`${rateLimitEvents.count} + 1` })
      .where(eq(rateLimitEvents.key, key));

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - currentCount - 1),
      resetInSeconds: Math.max(1, Math.ceil((existing[0].resetAt.getTime() - now) / 1000)),
    };
  } catch (err) {
    // Graceful fallback to memory check if DB latency spike occurs
    const currentMem = memoryCache.get(key);
    const allowed = (currentMem?.count ?? 1) <= config.maxRequests;
    return {
      allowed,
      remaining: allowed ? 1 : 0,
      resetInSeconds: config.windowSeconds,
    };
  }
}

/**
 * Synchronous in-memory rate limiter for ultra-low latency guards.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryCache.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryCache.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}
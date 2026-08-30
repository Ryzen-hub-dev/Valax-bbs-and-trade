import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const MAX_LOCAL_CACHE_SIZE = 5000;
const memoryCache = new Map<string, { count: number; resetAt: number }>();

function pruneMemoryCacheIfNeeded() {
  if (memoryCache.size > MAX_LOCAL_CACHE_SIZE) {
    const now = Date.now();
    memoryCache.forEach((v, k) => {
      if (v.resetAt <= now) {
        memoryCache.delete(k);
      }
    });
    if (memoryCache.size > MAX_LOCAL_CACHE_SIZE) {
      let count = 0;
      memoryCache.forEach((_, k) => {
        if (count < 1000) {
          memoryCache.delete(k);
          count++;
        }
      });
    }
  }
}

export function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  pruneMemoryCacheIfNeeded();

  const now = Date.now();
  const resetAtMs = now + config.windowSeconds * 1000;
  const resetDate = new Date(resetAtMs);

  const mem = memoryCache.get(key);
  if (mem && mem.resetAt > now) {
    if (mem.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.ceil((mem.resetAt - now) / 1000),
      };
    }
  }

  try {
    const existing = await db
      .select()
      .from(rateLimitEvents)
      .where(eq(rateLimitEvents.key, key))
      .limit(1);

    if (existing.length === 0 || existing[0].resetAt.getTime() <= now) {
      await db
        .insert(rateLimitEvents)
        .values({ key, count: 1, resetAt: resetDate })
        .onConflictDoUpdate({
          target: rateLimitEvents.key,
          set: { count: 1, resetAt: resetDate },
        });

      memoryCache.set(key, { count: 1, resetAt: resetAtMs });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetInSeconds: config.windowSeconds,
      };
    }

    const currentCount = existing[0].count;
    if (currentCount >= config.maxRequests) {
      memoryCache.set(key, { count: currentCount, resetAt: existing[0].resetAt.getTime() });
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

    const newCount = currentCount + 1;
    memoryCache.set(key, { count: newCount, resetAt: existing[0].resetAt.getTime() });

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetInSeconds: Math.max(1, Math.ceil((existing[0].resetAt.getTime() - now) / 1000)),
    };
  } catch (err) {
    console.error("[RateLimit Error] Database check failed, evaluating fallback:", err);
    const localEntry = memoryCache.get(key);
    if (!localEntry || localEntry.resetAt <= now) {
      memoryCache.set(key, { count: 1, resetAt: resetAtMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetInSeconds: config.windowSeconds };
    }
    if (localEntry.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((localEntry.resetAt - now) / 1000) };
    }
    localEntry.count++;
    return { allowed: true, remaining: config.maxRequests - localEntry.count, resetInSeconds: config.windowSeconds };
  }
}
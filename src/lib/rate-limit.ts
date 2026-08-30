import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  failClosed?: boolean; // When true, rejects traffic if database query fails (mandatory for financial/admin operations)
}

const MAX_LOCAL_CACHE_SIZE = 5000;
const memoryCache = new Map<string, { count: number; resetAt: number }>();
let lastDbCleanupTime = 0;

function pruneMemoryCacheIfNeeded() {
  const now = Date.now();
  if (memoryCache.size > MAX_LOCAL_CACHE_SIZE) {
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

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*:[0-9a-fA-F]{1,4}$/;

/**
 * Extracts and sanitizes client IP strictly using verified platform headers.
 */
export function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const candidate = vercelIp.split(",")[0].trim();
    if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
      return candidate;
    }
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const candidate = forwardedFor.split(",")[0].trim();
    if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
      return candidate;
    }
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    const candidate = realIp.trim();
    if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
      return candidate;
    }
  }

  return "127.0.0.1";
}

/**
 * Distributed Turso-backed single-atomic SQL rate limiter.
 * Executes a single atomic UPSERT with RETURNING to guarantee zero race conditions.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  pruneMemoryCacheIfNeeded();

  const now = Date.now();
  const resetAtMs = now + config.windowSeconds * 1000;
  const resetSeconds = Math.floor(resetAtMs / 1000);
  const nowSeconds = Math.floor(now / 1000);

  // 1. Fast in-memory rejection if already known to exceed limit
  const mem = memoryCache.get(key);
  if (mem && mem.resetAt > now && mem.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((mem.resetAt - now) / 1000)),
    };
  }

  // 2. Periodic background cleanup of expired database rate limit records (throttled to once every 60s)
  if (now - lastDbCleanupTime > 60000) {
    lastDbCleanupTime = now;
    db.run(sql`DELETE FROM rate_limit_events WHERE reset_at < ${nowSeconds}`).catch(() => {});
  }

  // 3. Single Atomic SQL UPSERT with RETURNING (No separate SELECT before UPDATE)
  try {
    const rows = (await db.all(sql`
      INSERT INTO rate_limit_events (key, count, reset_at)
      VALUES (${key}, 1, ${resetSeconds})
      ON CONFLICT(key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_events.reset_at <= ${nowSeconds} THEN 1
          ELSE rate_limit_events.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_events.reset_at <= ${nowSeconds} THEN ${resetSeconds}
          ELSE rate_limit_events.reset_at
        END
      RETURNING count, reset_at;
    `)) as Array<{ count: number | bigint; reset_at: number | bigint }>;

    if (rows && rows.length > 0) {
      const currentCount = Number(rows[0].count);
      const rowResetAtMs = Number(rows[0].reset_at) * 1000;
      memoryCache.set(key, { count: currentCount, resetAt: rowResetAtMs });

      if (currentCount <= config.maxRequests) {
        return {
          allowed: true,
          remaining: Math.max(0, config.maxRequests - currentCount),
          resetInSeconds: Math.max(1, Math.ceil((rowResetAtMs - now) / 1000)),
        };
      } else {
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds: Math.max(1, Math.ceil((rowResetAtMs - now) / 1000)),
        };
      }
    }

    // Fail-Closed check on empty RETURNING array
    if (config.failClosed) {
      console.warn(`[RateLimit FAIL_CLOSED] Empty RETURNING array on key "${key}". Denying request.`);
      return { allowed: false, remaining: 0, resetInSeconds: config.windowSeconds };
    }

    return { allowed: true, remaining: config.maxRequests - 1, resetInSeconds: config.windowSeconds };
  } catch (err) {
    // 4. Fail-closed handling for high-risk operations (Purchases, PayPal, Admin adjustments)
    if (config.failClosed) {
      console.error(`[RateLimit FAIL_CLOSED] Denying access to key "${key}" due to database check failure:`, err);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: config.windowSeconds,
      };
    }

    // Best-effort in-memory fallback for low-risk non-financial routes (Forums, viewing)
    const local = memoryCache.get(key);
    if (!local || local.resetAt <= now) {
      memoryCache.set(key, { count: 1, resetAt: resetAtMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetInSeconds: config.windowSeconds };
    }
    if (local.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((local.resetAt - now) / 1000) };
    }
    local.count++;
    return { allowed: true, remaining: config.maxRequests - local.count, resetInSeconds: config.windowSeconds };
  }
}
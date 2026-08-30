interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const memoryStore = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowSeconds: number } = { maxRequests: 20, windowSeconds: 60 }
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const { maxRequests, windowSeconds } = options;
  const windowMs = windowSeconds * 1000;

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { tokens: maxRequests, lastRefill: now };
    memoryStore.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed > windowMs) {
    bucket.tokens = maxRequests;
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetSeconds: Math.ceil((windowMs - elapsed) / 1000),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetSeconds: Math.ceil((windowMs - (now - bucket.lastRefill)) / 1000),
  };
}
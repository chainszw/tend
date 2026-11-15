interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Small fixed-window rate limiter kept in process memory. On serverless it
 * is per-instance, so it is a courtesy guard against bursts, not a hard quota.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function allow(key: string, now: number = Date.now()): boolean {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size > 5_000) buckets.clear();
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  };
}

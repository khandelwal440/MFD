// Fixed-window limiter, per key. Swap for Redis or the platform's limiter
// when running more than one instance.
const g = globalThis as unknown as { __mfpRate?: Map<string, { count: number; resetAt: number }> };
const buckets = (g.__mfpRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

const MAX_TRACKED_KEYS = 5000;

/**
 * Fixed-window limiter.
 * shortcut: counts live in this server instance's memory, so limits are per instance
 * and reset on restart; move to a shared store (e.g. Redis) before running several instances.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return (key: string, now: number = Date.now()): RateLimitResult => {
    if (windows.size > MAX_TRACKED_KEYS) {
      for (const [entryKey, entry] of windows) if (entry.resetAt <= now) windows.delete(entryKey);
      if (windows.size > MAX_TRACKED_KEYS) windows.clear();
    }
    const current = windows.get(key);
    if (!current || current.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }
    if (current.count >= limit) {
      return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    }
    windows.set(key, { ...current, count: current.count + 1 });
    return { ok: true, retryAfterSeconds: 0 };
  };
}

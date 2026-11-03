export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimiter {
  /** Records a hit for the key and returns false when the key is over its limit. */
  readonly hit: (key: string) => boolean;
}

interface Window {
  readonly startedAt: number;
  readonly count: number;
}

const UNKNOWN_CLIENT = 'unknown';
/** Hard ceiling on tracked keys. */
const MAX_TRACKED_KEYS = 10_000;
/** When the map is full of live windows, new clients share this bucket and are limited together. */
const OVERFLOW_KEY = '__overflow__';
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * Fixed-window limiter held in process memory. Enough for a single Render instance and the
 * sandbox demo; swap for a shared store before scaling out.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>();

  /** Drops expired windows; only runs when the map is full, so the scan is bounded and rare. */
  function pruneExpired(now: number): void {
    for (const [k, w] of windows) {
      if (now - w.startedAt >= options.windowMs) {
        windows.delete(k);
      }
    }
  }

  /** Picks the bucket for a key: its own, or the shared overflow bucket when full of live windows. */
  function bucketFor(key: string, now: number): string {
    if (windows.has(key) || windows.size < MAX_TRACKED_KEYS) {
      return key;
    }
    pruneExpired(now);
    return windows.size < MAX_TRACKED_KEYS ? key : OVERFLOW_KEY;
  }

  return {
    hit: (key: string): boolean => {
      const now = Date.now();
      const bucket = bucketFor(key, now);
      const current = windows.get(bucket);
      const fresh = !current || now - current.startedAt >= options.windowMs;
      const next: Window = fresh
        ? { startedAt: now, count: 1 }
        : { startedAt: current.startedAt, count: current.count + 1 };
      windows.set(bucket, next);
      return next.count <= options.limit;
    },
  };
}

/**
 * Client identity behind Render's proxy. The proxy appends the connecting address to the end of
 * X-Forwarded-For, so only the right-most entry is trusted; anything the client sends sits left.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',') ?? [];
  return forwarded[forwarded.length - 1]?.trim() || UNKNOWN_CLIENT;
}

/** Returns a 429 envelope when the client is over the limit, otherwise null. */
export function enforceRateLimit(req: Request, limiter: RateLimiter): Response | null {
  if (limiter.hit(clientKey(req))) {
    return null;
  }
  return Response.json(
    { success: false, data: null, error: 'Too many requests. Try again in a minute.' },
    { status: HTTP_TOO_MANY_REQUESTS },
  );
}

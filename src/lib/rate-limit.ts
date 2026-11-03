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
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * Fixed-window limiter held in process memory. Enough for a single Render instance and the
 * sandbox demo; swap for a shared store before scaling out.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>();
  return {
    hit: (key: string): boolean => {
      const now = Date.now();
      const current = windows.get(key);
      const fresh = !current || now - current.startedAt >= options.windowMs;
      const next: Window = fresh
        ? { startedAt: now, count: 1 }
        : { startedAt: current.startedAt, count: current.count + 1 };
      windows.set(key, next);
      return next.count <= options.limit;
    },
  };
}

/** Best-effort client identity behind Render's proxy. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || UNKNOWN_CLIENT;
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

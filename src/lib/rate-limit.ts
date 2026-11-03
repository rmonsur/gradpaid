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
/**
 * When the map is full of live windows, a new client is limited together with its network
 * neighbours (IPv4 /24, IPv6 /64) at the normal limit: fail closed, and one flooding network
 * cannot consume the budget of unrelated networks. A shared store would replace this at scale.
 */
const OVERFLOW_PREFIX = '__net__';
const IPV4_PREFIX_OCTETS = 3;
const IPV6_PREFIX_HEXTETS = 4;

function networkBucket(key: string): string {
  if (key.includes(':')) {
    return `${OVERFLOW_PREFIX}${key.split(':').slice(0, IPV6_PREFIX_HEXTETS).join(':')}`;
  }
  return `${OVERFLOW_PREFIX}${key.split('.').slice(0, IPV4_PREFIX_OCTETS).join('.')}`;
}
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * Fixed-window limiter held in process memory. Enough for a single Render instance and the
 * sandbox demo; swap for a shared store before scaling out.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>();

  /**
   * The map is kept in window start order (fresh windows are re-inserted at the back), so
   * expired entries sit at the front and pruning stops at the first live one: O(expired), not O(n).
   */
  function popExpired(now: number): void {
    for (const [k, w] of windows) {
      if (w.startedAt > now) {
        continue;
      }
      if (now - w.startedAt < options.windowMs) {
        return;
      }
      windows.delete(k);
    }
  }

  /** Picks the bucket for a key: its own, or the shared overflow bucket when full of live windows. */
  function bucketFor(key: string, now: number): string {
    if (windows.has(key) || windows.size < MAX_TRACKED_KEYS) {
      return key;
    }
    popExpired(now);
    return windows.size < MAX_TRACKED_KEYS ? key : networkBucket(key);
  }

  return {
    hit: (key: string): boolean => {
      const now = Date.now();
      const bucket = bucketFor(key, now);
      const limit = options.limit;
      const current = windows.get(bucket);
      const fresh = !current || now - current.startedAt >= options.windowMs;
      if (fresh) {
        windows.delete(bucket);
        windows.set(bucket, { startedAt: now, count: 1 });
        return limit >= 1;
      }
      const next: Window = { startedAt: current.startedAt, count: current.count + 1 };
      windows.set(bucket, next);
      return next.count <= limit;
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

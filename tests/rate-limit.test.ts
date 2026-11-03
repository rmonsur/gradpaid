import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

const LIMIT = 3;
const WINDOW_MS = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

describe('createRateLimiter', () => {
  it('allows the configured number of hits per key and then refuses within the window', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: LIMIT, windowMs: WINDOW_MS });
    expect([limiter.hit('a'), limiter.hit('a'), limiter.hit('a')]).toEqual([true, true, true]);
    expect(limiter.hit('a')).toBe(false);
    expect(limiter.hit('b')).toBe(true);
  });

  it('allows again once the window has elapsed', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW_MS });
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('a')).toBe(false);
    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(limiter.hit('a')).toBe(true);
  });
});

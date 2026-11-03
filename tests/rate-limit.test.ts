import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRateLimiter, clientKey } from '@/lib/rate-limit';

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

describe('clientKey', () => {
  it('trusts only the right-most forwarded address', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': 'spoofed, 203.0.113.9' },
    });
    expect(clientKey(req)).toBe('203.0.113.9');
  });
});

describe('tracked key ceiling', () => {
  it('never drops a live counter; new clients beyond the ceiling share one limited bucket', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW_MS });
    for (let i = 0; i < 10_000; i += 1) {
      limiter.hit(`k${i}`);
    }
    expect(limiter.hit('k0')).toBe(true);
    expect(limiter.hit('k0')).toBe(false);
    expect(limiter.hit('new-a')).toBe(true);
    expect(limiter.hit('new-b')).toBe(true);
    expect(limiter.hit('new-c')).toBe(false);
  });

  it('frees room for new clients once old windows expire', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW_MS });
    for (let i = 0; i < 10_000; i += 1) {
      limiter.hit(`k${i}`);
    }
    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(limiter.hit('late-a')).toBe(true);
    expect(limiter.hit('late-b')).toBe(true);
  });
});

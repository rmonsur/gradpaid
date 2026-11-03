import { createRateLimiter, type RateLimiter } from './rate-limit';

const ONE_MINUTE_MS = 60_000;
const CHAT_PER_MINUTE = 20;
const INTAKE_PER_MINUTE = 5;
const CHECKOUT_PER_MINUTE = 30;
const CLIENT_TOKEN_PER_MINUTE = 30;
const INTERNAL_PER_MINUTE = 10;

/** One limiter per public endpoint, shared across requests in this process. */
export const RATE_LIMITS: Readonly<Record<string, RateLimiter>> = {
  chat: createRateLimiter({ limit: CHAT_PER_MINUTE, windowMs: ONE_MINUTE_MS }),
  intake: createRateLimiter({ limit: INTAKE_PER_MINUTE, windowMs: ONE_MINUTE_MS }),
  checkout: createRateLimiter({ limit: CHECKOUT_PER_MINUTE, windowMs: ONE_MINUTE_MS }),
  clientToken: createRateLimiter({ limit: CLIENT_TOKEN_PER_MINUTE, windowMs: ONE_MINUTE_MS }),
  internal: createRateLimiter({ limit: INTERNAL_PER_MINUTE, windowMs: ONE_MINUTE_MS }),
};

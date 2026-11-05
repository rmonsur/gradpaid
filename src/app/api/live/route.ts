import { ok, handle } from '@/lib/http';
import { getLiveSnapshot } from '@/features/live/service';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { getPlatformBalance, type PlatformBalance } from '@/lib/paypal/balances';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';
import { logger } from '@/lib/logger';

/** PayPal refreshes balances on its side; asking more often than this only spends quota. */
const BALANCE_CACHE_MS = 5_000;

let cached: { readonly at: number; readonly value: PlatformBalance | null } | null = null;

async function platformBalance(): Promise<PlatformBalance | null> {
  if (cached && Date.now() - cached.at < BALANCE_CACHE_MS) {
    return cached.value;
  }
  try {
    const value = await getPlatformBalance(createPayPalToolkit({}).toolkit);
    cached = { at: Date.now(), value };
  } catch (err) {
    logger.warn({ err }, 'platform balance unavailable');
    cached = { at: Date.now(), value: null };
  }
  return cached.value;
}

export async function GET(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.live);
  if (limited) {
    return limited;
  }
  return handle<unknown>(async () => {
    const [snapshot, balance] = await Promise.all([getLiveSnapshot(), platformBalance()]);
    return ok({ ...snapshot, paypalPlatformBalance: balance });
  });
}

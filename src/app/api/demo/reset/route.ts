import { ok, fail, handle, checkInternalAuth } from '@/lib/http';
import { resetDemo } from '@/features/demo/seed';
import { getEnv } from '@/lib/env';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';

export async function POST(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.internal);
  if (limited) {
    return limited;
  }
  return handle(async () => {
    if (!checkInternalAuth(req, ['demo'])) {
      return fail('Unauthorized', 401);
    }
    return ok(await resetDemo(getEnv().PAYPAL_SPONSOR_EMAIL));
  });
}
